// part of kellyShowRate extension, see kellyShowRate.js for copyrights and description

var KellyStorage = { 
        
        apiListRevisionCurrent : 4, // for reset list on major changes
        
        apis : {},  // pool from external files from lib/apis/
        apisDefaultOrder : ['youtubeMetric','catface','ryda','sponsorsBlock'],
        
        fields : {       

            showRatio : {optional : true, defaultOptional : true},           
            showSource : {optional : true, defaultOptional : true},

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
    
    KellyStorage.validateCfgApis = function(cfg) {
                
        var handler = KellyStorage;
        
        if (!cfg.apis || typeof cfg.apis.cfg == 'undefined' || typeof cfg.apis.order == 'undefined' || handler.apiListRevisionCurrent != cfg.apiListRevision) {
            cfg.apis = {
                order : handler.apisDefaultOrder,
                cfg : {},
            }
            
            handler.log('use default settings for apis cfg', true); 
        }
        
        var apisOrder = cfg.apis.order;
        cfg.apis.order = [];
        
        // exclude unexisted \ removed apis
        for (var i=0; i < apisOrder.length; i++) {
            
            if (typeof handler.apis[apisOrder[i]] == 'undefined') {
                handler.log('[Api not exist] deprecated API Id in order array skipped ' + apisOrder[i], true);
                continue;
            }
            
            cfg.apis.order.push(apisOrder[i]);
        }
        
       for (var key in cfg.apis.cfg) {
            if (typeof handler.apis[key] == 'undefined') {
                handler.log('[Api not exist] deprecated API [Object] skipped ' + key, true);
                delete cfg.apis.cfg[key];
            }                 
       }
       
       // validate stored cfg data [enabled, syncData ...]
       for (var i=0; i < cfg.apis.order.length; i++) {
            if (typeof cfg.apis.cfg[cfg.apis.order[i]] == 'undefined') {
                cfg.apis.cfg[cfg.apis.order[i]] = handler.apis[cfg.apis.order[i]].cfgDefault;
                
                handler.log('set to defaults ' + cfg.apis.order[i], true);
            }
        }
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
        
        // todo optionaly we can validate apis.cfg[key] = {} - objects
        KellyStorage.validateCfgApis(cfg);
        
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