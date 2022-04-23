// part of kellyShowRate extension, see kellyShowRate.js for copyrights and description

var KellyStorage = { 
        
        apiListRevisionCurrent : 5, // for reset list on major changes
        apisDefaultOrder : ['youtubeMetric','ryda','sponsorsBlock','catface'],
        
        apis : {},  // pool from external files from lib/apis/        
        
        fields : {       

            showRatio : {optional : true, defaultOptional : true},           
            showSource : {optional : true, defaultOptional : true},
            showPercent : {optional : true, defaultOptional : false},
            popupAvoidBounds : {optional : true, defaultOptional : true},
            
            fixedRatioWidth : {optional : true, type : 'int', defaultOptional : false, default : 150, limit : {from : 60, to : 350}},
            fixedRatioHeight : {optional : true, type : 'int', defaultOptional : false, default : 5, limit : {from : 1, to : 8}}, 
            
            ratioLikeColor : {type : 'string', default : '#75bc49', hidden : true},
            ratioDislikeColor : {type : 'string', default : '#cc6a7c', hidden : true},
            ratioLoadingColor : {type : 'string', default : '#ffd023', hidden : true,},
            apiListRevision : {type : 'int', hidden : true,},
            
            tTimeout : {type : 'float', default : 3},
            debug : {optional : true, defaultOptional : false},
            
            /*
                json data
                
                {
                    catface : {enabled : true, syncData : true, enabledAsHelper : true, [optional] ratioLikeColor :  ratioDislikeColor : ratioLoadingColor : },
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
            '__ratio_options__', 
                'showSource', 
                'showPercent',
                'fixedRatioWidth',
                'fixedRatioHeight',
                'popupAvoidBounds',
            '_/ratio_options/_', 
            '__datasources__', 
                // content generates throw kellyCOption methods
            '_/datasources/_', 
            '__colorring__', 
                // content generates throw kellyCOption methods
            '_/colorring/_', 
            '__additions__', 
                'debug', 
                'tTimeout', 
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
        
        // exclude unexisted \ removed apis from current config
        
        for (var i=0; i < apisOrder.length; i++) {
            
            if (typeof handler.apis[apisOrder[i]] == 'undefined') {
                handler.log('[Api not exist] deprecated API Id in order array skipped ' + apisOrder[i], true);
                continue;
            }
            
            cfg.apis.order.push(apisOrder[i]);
        }
        
       for (var apiId in cfg.apis.cfg) {
            if (typeof handler.apis[apiId] == 'undefined') {
                handler.log('[Api not exist] deprecated API [Object] skipped ' + apiId, true);
                delete cfg.apis.cfg[apiId];
            }                 
       }

       // add new apis default settings to current config
       // validate stored cfg data [enabled, syncData ...]
       // check for new drivers listed in default order - to major changes better use [apiListRevisionCurrent + notify oninstall \ update what was changed]
       
       for (var i=0; i < handler.apisDefaultOrder.length; i++) {
            var apiId = handler.apisDefaultOrder[i];
            
            if (typeof handler.apis[apiId] == 'undefined') {
                handler.log('apisDefaultOrder disabled item skip ' + apiId, true); 
                continue;
            }
            
            var cfgOrderIndex = cfg.apis.order.indexOf(handler.apisDefaultOrder[i]);
            
            if (typeof cfg.apis.cfg[apiId] == 'undefined') {
                cfg.apis.cfg[apiId] = handler.apis[apiId].cfgDefault;
                
                if (cfgOrderIndex == -1) {
                    // turn off by default ?
                    handler.log('new driver listed ' + apiId, true);
                    cfg.apis.order.push(apiId);
                }
                
                handler.log('set to defaults ' + apiId, true);
            }
        }
        
        // todo optionaly we can validate cfg.apis.cfg[key] = {enabled : bool, syncData : bool} - objects
    }
    
    KellyStorage.validateCfg = function(cfg) {
        
        var handler = KellyStorage;
        
        if (!cfg) cfg = {};
        
        // validate loaded array
        
        for (var key in handler.fields) {
            
            if (typeof cfg[key] == 'undefined') {
                cfg[key] = handler.fields[key].default;
            } else {
                
                cfg[key] = handler.validateCfgVal(key, cfg[key]);
                
                if (handler.fields[key].limit) {
                   if (handler.fields[key].limit.to && cfg[key] > handler.fields[key].limit.to) cfg[key] = handler.fields[key].default;
                   if (handler.fields[key].limit.from && cfg[key] < handler.fields[key].limit.from) cfg[key] = handler.fields[key].default;                   
                }
            }            
            
            if (handler.fields[key].optional && typeof cfg[key + 'Enabled'] == 'undefined') {
                 cfg[key + 'Enabled'] = handler.fields[key].defaultOptional;
            }            
        }
        
        // console.log(cfg);
        
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
            
            if (KellyTools.getBrowser().runtime.lastError) {   
            
                KellyTools.DEBUG = true;
                handler.log('cant get BG process. Error : ' + ( KellyTools.getBrowser().runtime.lastError ? KellyTools.getBrowser().runtime.lastError.message : 'unknown' ), true);
                KellyStorage.bgFail = true;
                
            } else {
                         
                if (response.item) {
                    
                    handler.cfg = response.item;
                                        
                    if (!handler.cfg) {
                        handler.log('db exist but structured data parsing fail ' + name);
                        handler.cfg = false;
                    }
                    
                } else handler.log('config not changed ' + name + ', use defaults', true);
                
                KellyTools.DEBUG = handler.cfg.debugEnabled ? true : false;
            }
            
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