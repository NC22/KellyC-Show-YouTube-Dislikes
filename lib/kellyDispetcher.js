// part of kellyShowRate extension, see kellyShowRate.js for copyrights and description

var KellyEDispetcher = new Object();
    KellyEDispetcher.init = function() {
        
             if (typeof chrome !== 'undefined' && typeof chrome.runtime !== 'undefined') KellyEDispetcher.api = chrome;
        else if (typeof browser !== 'undefined' && typeof browser.runtime !== 'undefined') KellyEDispetcher.api = browser;
        
        KellyEDispetcher.api.runtime.onMessage.addListener(this.onMessage);
        
        return true;
    }
            
    KellyEDispetcher.onMessage = function(request, sender, callback) {

            var response = {
                
                senderId : 'dispetcher',
                error : '',
                method : request.method,
                
            }
                   
            if (request.method == "getLocalStorageItem") {
                
                if (request.dbName) {
                    
                    KellyEDispetcher.api.storage.local.get(request.dbName, function(item) {
         
                        response.item = item[request.dbName];
                        
                        if (callback) callback(response);
                    });	
                    
                    return true; // async mode
                    
                } else response.item = false;
                
            } else if (request.method == 'getCss') { 
             
                fetch('/env/css/main.css', {  method: 'GET' }).then(function(r) {
                    
                    return r.text().then(function(data) {
                                            
                        response.css = data;
                        
                        if (callback) callback(response); 
                    });

                }).then(function(text) {}).catch(function(error) { 
                    if (callback) callback(response); 
                });
                
                return true; // async mode
                
            } else if (request.method == "setLocalStorageItem") {
                
                if (request.dbName && request.data) {
                    
                    var save = {};
                        save[request.dbName] = request.data;
                        
                    KellyEDispetcher.api.storage.local.set(save, function() {
                    
                        if (KellyEDispetcher.api.runtime.lastError) {                            
                            response.error = KellyEDispetcher.api.runtime.lastError.message;                            
                        } else {                            
                            response.error = false;                            
                        }
                        
                        if (callback) callback(response);
                    });
                    
                    return true; // async mode
                }
            
            } else if (request.method == 'getYoutubeInfo') {
                
                var cancelTimer = false;
                var frequest = new AbortController();
                var canceled = false;
                var onRequestEnd = function() {
                    
                    canceled = true;
                    if (frequest) {
                        frequest.abort();
                        frequest = false;
                    }
                       
                    if (cancelTimer) {                    
                        clearTimeout(cancelTimer);
                        cancelTimer = false;
                    }
                    
                }
                
                var requestParams = {
                    signal: frequest.signal, 
                    method: 'GET',
                    cache: 'no-cache',
                    credentials : 'omit',
                    mode: 'cors',
                    referrer: '',
                    redirect: 'follow',
                    referrerPolicy : 'no-referrer',                    
                };
                
                if (request.requestCfg.fetchParams) {
                    for (var k in request.requestCfg.fetchParams) {
                        if (k != 'credentials') {
                            fetchRequest.cfg[k] = cfg[k];
                        }
                    }
                }    
                
                response.ydata = false; 
                
                fetch(request.src, requestParams).then(function(r) {
                    
                    if (canceled) return;
                    
                    response.status = r.status;
                    if (r.status != 200) {
                        
                        response.error = 'Bad response [code : ' + r.status + ']';                        
                        onRequestEnd();
                        
                        if (callback) callback(response);
                        
                    } else if (request.requestCfg.asText) {
                        
                         return r.text().then(function(rawText) {
                                                
                            response.ydata = rawText;                            
                            onRequestEnd();
                            
                            if (callback) callback(response); 
                        });
                        
                    } else {
                        
                        return r.json().then(function(ydata) {
                                                
                            response.ydata = ydata;
                            onRequestEnd();
                            
                            if (callback) callback(response); 
                        });
                        
                    }

                }).then(function(text) {
                    
                })
                .catch(function(error) { 
                
                    if (canceled) return;
                    
                    response.error = '[catch] ' + error.message;                    
                    onRequestEnd();
                    
                    if (callback) callback(response); 
                });
                
                if (request.timeout > 0) {
                    cancelTimer = setTimeout(function() {
                        
                        response.error = 'Request timeout';
                        onRequestEnd();
                        
                        if (callback) callback(response);
                        
                    }, request.timeout * 1000);
                }
                
                return true; // async mode
            }
            
            if (callback) callback(response); 
    }

    KellyEDispetcher.init();