// part of kellyShowRate extension, see kellyShowRate.js for copyrights and description

var KellyStorage = {    
        fields : {       

            showRatio : {optional : true, defaultOptional : true},           
            showSource : {optional : true, defaultOptional : false},

            forceApi : {optional : true, defaultOptional : false},
            
            ratioLikeColor : {type : 'string', default : '#75bc49', hidden : true},
            ratioDislikeColor : {type : 'string', default : '#cc6a7c', hidden : true},
            ratioLoadingColor : {type : 'string', default : '#ffd023', hidden : true,},
            
            rTimeout : {type : 'float', default : 2},
            debug : {optional : true, defaultOptional : false},
        },        
        
        fieldsOrder : ['showRatio', 'ratioLikeColor', 'ratioDislikeColor', 'ratioLoadingColor', '__colorring__', '_/colorring/_', '__additions__', 'showSource', 'forceApi', 'debug', 'rTimeout', '_/additions/_'],   
                                
        cfg : false, lastValidateError : false,
    };
    
    KellyStorage.validateCfgVal = function(key, val) {
        
         if (typeof this.fields[key] == 'undefined') return '';
         if (typeof val == 'undefined') val = this.fields[key].default;
         
         return this.fields[key].val ? this.fields[key].val(val) : KellyTools.val(val, this.fields[key].type);
    }
    
    KellyStorage.validateCfg = function(cfg) {

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