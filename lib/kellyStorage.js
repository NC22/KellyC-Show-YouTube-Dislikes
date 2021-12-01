// part of kellyShowRate extension, see kellyShowRate.js for copyrights and description

var KellyStorage = { 
        
        apiListRevisionCurrent : 1, // for reset list on major changes
        
        apis : {            
             youtubeMetric : {
                 name : 'YouTube metric', 
                 desc : 'local metric reader. Restore likes\\ dislikes based on rating data for video'
             },
             catface : { 
                name : "CatFace.ru cache API", 
                desc : 'Uses metric data taken from YouTube (until this possible)', 
                link : 'https://catface.ru/'
             },             
             ryda : {
                 name : 'Return YouTube Dislikes API', 
                 desc : 'Use collected and archived YouTube data about dislikes and likes, collects new actions data from users so data will be pretty accurate, more answers can be found here https://returnyoutubedislike.com/faq', 
                 link : 'https://returnyoutubedislike.com/', 
                 donate : 'https://returnyoutubedislike.com/donate',
                 sync : true,
             },
             sponsorsBlock : {
                 name : 'SponsorsBlock Rating API',
                 desc : 'Uses its own data base of actions that users makes throw SponsorsBlock extension and extensions that support API',
                 link : 'https://sponsor.ajay.app/', 
                 ppLink : 'https://gist.github.com/ajayyy/aa9f8ded2b573d4f73a3ffa0ef74f796',
                 sync : true,
             },
        },
        
        apisCfgDefaults : {
            youtubeMetric : {enabled : true},
            catface : {enabled : true},
            ryda : {enabled : true, syncData : true},
            sponsorsBlock : {enabled : true, syncData : true, ratioLikeColor : '#55caff', ratioDislikeColor : '#ededed'},
        },
        
        fields : {       

            showRatio : {optional : true, defaultOptional : true},           
            showSource : {optional : true, defaultOptional : false},

            forceApi : {optional : true, defaultOptional : false},
            
            ratioLikeColor : {type : 'string', default : '#75bc49', hidden : true},
            ratioDislikeColor : {type : 'string', default : '#cc6a7c', hidden : true},
            ratioLoadingColor : {type : 'string', default : '#ffd023', hidden : true,},
            apiListRevision : {type : 'int', hidden : true,},
            
            rTimeout : {type : 'float', default : 2},
            debug : {optional : true, defaultOptional : false},
            
            apisOrder : {type : 'string', default : 'youtubeMetric,catface,ryda,sponsorsBlock', hidden : true},
            
            /*
                json data
                
                {
                    catface : {enabled : true, syncActions : true, [optional] colors : {like : [HEX COLOR], dislike : [HEX COLOR]}, },
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
                'forceApi', 
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
        
        if (!cfg.apis || handler.apiListRevisionCurrent != cfg.apiListRevision) {
            cfg.apis = {
                order : [],
                cfg : {},
            }
            
            handler.log('use default settings for apis cfg', true); 
        }
        
        var apisOrder = cfg.apisOrder.split(',');
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