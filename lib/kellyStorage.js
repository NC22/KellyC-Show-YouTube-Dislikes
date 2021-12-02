// part of kellyShowRate extension, see kellyShowRate.js for copyrights and description

var KellyStorage = { 
        
        apiListRevisionCurrent : 1, // for reset list on major changes
        
        /*
            {
                name : string,
                color : string (color in hex format),
                api : string (link to api url),
                maxAttempts : int | default : 3 (max number of attempts to requests data before go to next driver) 
                maxAttempts - can be ignored if request was succesfull but data corrupted or have deprecated or unknown format
                nextDriverTimeout : int | default : 200 (timeout before next driver call after fail all attempts)
                fetchParams : object that represent of fetch cfg params (using cookies is restricted) | default in kellyDispetcher
            }
        */
        
        apis : {            
             youtubeMetric : {
                 name : 'YouTube Meta',
                 color : '#ff4949',
                 api : 'https://www.youtube.com/watch?v=__VIDEOID__&app=desktop'
             },
             catface : { 
                name : "CatFace.ru cache API", 
                link : 'https://catface.ru/',
                api : 'https://catface.ru/api/youtube/?videoId=__VIDEOID__',
             },             
             ryda : {
                 name : 'Return YouTube Dislikes API', 
                 link : 'https://returnyoutubedislike.com/', 
                 donate : 'https://returnyoutubedislike.com/donate',
                 
                 api : 'https://returnyoutubedislikeapi.com/votes?videoId=__VIDEOID__',
                 
                 sync : false, // currently not implemented in API
             },
             sponsorsBlock : {
                 name : 'SponsorsBlock Rating API (testing)',
                 link : 'https://sponsor.ajay.app/', 
                 ppLink : 'https://gist.github.com/ajayyy/aa9f8ded2b573d4f73a3ffa0ef74f796',
                 
                 // api doc : https://wiki.sponsor.ajay.app/w/API_Docs/Ratings
                 
                 api :  'https://sponsor.ajay.app/api/ratings/rate/__VIDEOIDSHA256__', 
                 apiAction :  'https://sponsor.ajay.app/api/ratings/rate',
                 
                 sync : true,
                 showZero : true,
             },
        },
        
        apisDefaultOrder : ['youtubeMetric','catface','ryda','sponsorsBlock'],
        apisCfgDefaults : {
            youtubeMetric : {enabled : true},
            catface : {enabled : true},
            ryda : {enabled : true, syncData : true},
            sponsorsBlock : {enabled : false, syncData : true, ratioLikeColor : '#55caff', ratioDislikeColor : '#ededed'},
        },
        
        fields : {       

            showRatio : {optional : true, defaultOptional : true},           
            showSource : {optional : true, defaultOptional : false},

            // forceApi : {optional : true, defaultOptional : false}, - deprecated - replaced by apis order
            
            ratioLikeColor : {type : 'string', default : '#75bc49', hidden : true},
            ratioDislikeColor : {type : 'string', default : '#cc6a7c', hidden : true},
            ratioLoadingColor : {type : 'string', default : '#ffd023', hidden : true,},
            apiListRevision : {type : 'int', hidden : true,},
            
            rTimeout : {type : 'float', default : 2},
            debug : {optional : true, defaultOptional : false},
            
            /*
                json data
                
                {
                    catface : {enabled : true, syncActions : true, [optional] ratioLikeColor :  ratioDislikeColor : ratioLoadingColor : },
                    ...
                }
            */
            
            // apis : {cfg, order}
        },        
        
        fieldsHelp : ['__datasources__'],
        
        fieldsOrder : [
            'showRatio', 
            'ratioLikeColor', 
            'ratioDislikeColor', 
            'ratioLoadingColor', 
            '__datasources__', 
                // content generates throw kellyCOption methods
            '_/datasources/_', 
            '__colorring__', 
                // content generates throw kellyCOption methods
            '_/colorring/_', 
            '__additions__', 
                'showSource', 
                // 'forceApi', 
                'debug', 
                'rTimeout', 
            '_/additions/_',
        ],   
                                
        cfg : false, lastValidateError : false,
    };
    
    KellyStorage.fields.apiListRevision.default = KellyStorage.apiListRevisionCurrent;
    KellyStorage.validateCfgVal = function(key, val) {
        
         if (typeof this.fields[key] == 'undefined') return '';
         if (typeof val == 'undefined') val = this.fields[key].default;
         
         return this.fields[key].val ? this.fields[key].val(val) : KellyTools.val(val, this.fields[key].type);
    }
    
    KellyStorage.validateCfg = function(cfg) {
        
        var handler = KellyStorage;
        
        if (!cfg) cfg = {};
        
        // validate loaded array
        
        for (var key in this.fields) {
            
            if (typeof cfg[key] == 'undefined') {
                cfg[key] = this.fields[key].default;
            } 
            
            if (this.fields[key].optional && typeof cfg[key + 'Enabled'] == 'undefined') {
                 cfg[key + 'Enabled'] = this.fields[key].defaultOptional;
            }
        }
        
        console.log(cfg);
        if (!cfg.apis || typeof cfg.apis.cfg == 'undefined' || typeof cfg.apis.order == 'undefined' || handler.apiListRevisionCurrent != cfg.apiListRevision) {
            cfg.apis = {
                order : handler.apisDefaultOrder,
                cfg : {},
            }
            
            handler.log('use default settings for apis cfg', true); 
        }
        
        var apisOrder = cfg.apis.order;
        cfg.apis.order = [];
        
        for (var i=0; i < apisOrder.length; i++) {
            
            if (typeof handler.apis[apisOrder[i]] == 'undefined') {
                handler.log('[Api not exist] deprecated API Order skipped ' + apisOrder[i], true);
                continue;
            }
            
            cfg.apis.order.push(apisOrder[i]);
        }
        
       for (var key in cfg.apis.cfg) {
            if (typeof handler.apis[key] == 'undefined') {
                handler.log('[Api not exist] deprecated API ENT skipped ' + key, true);
                delete cfg.apis.cfg[key];
            }                 
       }
       
       for (var i=0; i < cfg.apis.order.length; i++) {
            if (typeof cfg.apis.cfg[cfg.apis.order[i]] == 'undefined') {
                cfg.apis.cfg[cfg.apis.order[i]] = handler.apisCfgDefaults[cfg.apis.order[i]];
                
                handler.log('set to defaults ' + cfg.apis.order[i], true);
            }
        }
        
        // todo optionaly we can validate apis.cfg[key] = {} - objects
        
        return cfg;
    }
    
    KellyStorage.addField = function(before, key, data) {            
        if (data) this.fields[key] = data;
        before ? this.fieldsOrder.splice(this.fieldsOrder.indexOf(before), 0, key) : this.fieldsOrder.push(key);
    }
    
    KellyStorage.load = function(callback) {
        
      var handler = this;
      
      KellyTools.getBrowser().runtime.sendMessage({
            method: "getLocalStorageItem", 
            dbName : 'kelly-show-rating-cfg',
        }, function(response) {
            
            handler.cfg = false;                
            if (response.item) {
                
                handler.cfg = response.item;
                                    
                if (!handler.cfg) {
                    handler.log('db exist but structured data parsing fail ' + name);
                    handler.cfg = false;
                }
                
            } else handler.log('config not changed ' + name + ', use defaults', true);
            
            KellyTools.DEBUG = handler.cfg.debugEnabled ? true : false; 
            handler.cfg = handler.validateCfg(handler.cfg);
            
            if (callback) callback(handler.cfg);
        });
            
    }
    
    KellyStorage.save = function(data, callback) {
        
        KellyTools.getBrowser().runtime.sendMessage({
            method: "setLocalStorageItem", 
            dbName : 'kelly-show-rating-cfg',
            data : data,
        }, function(response) {
        
            if (response.error) {
                handler.log(response.error);
            }
            
            if (callback) callback(response.error ? true : false);
        });
    }
    
    KellyStorage.log = function(err, notice) {        
        KellyTools.log(err, 'KellyStorage', notice ? KellyTools.E_NOTICE : KellyTools.E_ERROR);
    }