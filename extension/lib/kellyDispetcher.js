// part of kellyShowRate extension, see kellyShowRate.js for copyrights and description

var KellyEDispetcher = new Object();

    KellyEDispetcher.updatePageRevision = ['1.1.3.9', '1.1.4.0', '1.1.4.1', '1.1.4.2']; // versions, that related to update.html page text, if already notified on one of listed versions - skip
    KellyEDispetcher.init = function() {
        
             if (typeof browser !== 'undefined' && typeof browser.runtime !== 'undefined') KellyEDispetcher.api = browser;
        else if (typeof chrome !== 'undefined' && typeof chrome.runtime !== 'undefined') KellyEDispetcher.api = chrome;     
        
        KellyEDispetcher.api.runtime.onMessage.addListener(this.onMessage);
        KellyEDispetcher.api.runtime.onInstalled.addListener(function(details){
             
                if (details.reason == "install") {
                    
                   console.log('[install]');  
                   KellyEDispetcher.api.tabs.create({url: '/env/page/update.html?mode=install'}, function(tab){});
                   
                } else if (details.reason == "update") {
                   
                   console.log('[update] ' + details.previousVersion + ' - ' + KellyEDispetcher.api.runtime.getManifest().version);
                   if ( details.previousVersion.indexOf(KellyEDispetcher.api.runtime.getManifest().version) === 0 ) {
                        console.log('[update] skip update info - same version');
                        return;
                   }
                   
                   if ( KellyEDispetcher.updatePageRevision.indexOf(KellyEDispetcher.api.runtime.getManifest().version) == -1 ) {
                        console.log('[update] skip update info - mismatch version');
                        return;
                   }
                   
                   KellyEDispetcher.api.storage.local.get('kelly-extension-update-inform', function(item) {
         
                        if (KellyEDispetcher.api.runtime.lastError) {                        
                            console.log(KellyEDispetcher.api.runtime.lastError);                            
                        } else {
                            
                            var revisionInfo = item['kelly-extension-update-inform'];                        
                            if (!revisionInfo || KellyEDispetcher.updatePageRevision.indexOf(revisionInfo.revision) == -1) {
                                
                                console.log('[update] needs to notify');                                
                                KellyEDispetcher.api.tabs.create({url: '/env/page/update.html?mode=update'}, function(tab){});
                                KellyEDispetcher.api.storage.local.set({'kelly-extension-update-inform' : {revision : KellyEDispetcher.api.runtime.getManifest().version}}, function() {
                                
                                    if (KellyEDispetcher.api.runtime.lastError) {                            
                                        console.log(KellyEDispetcher.api.runtime.lastError);                       
                                    }
                                });
                            } else {
                                console.log('[update] already notified in ' + revisionInfo.revision);
                            }
                        }
                    });	
                }
        });
    
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
                
                if (request.dbName && typeof request.data != 'undefined') {
                    
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
                
                var defaultAbortController = new Object();
                    defaultAbortController.abort = function() {
                        console.log('[Warning] AbortController is undefined. Default statement used');
                }
                
                var frequest = typeof AbortController == 'undefined' ? defaultAbortController : new AbortController();
                
                var cancelTimer = false;                
                var canceled = false;
                var onRequestEnd = function() {
                    
                    canceled = true;
                    if (frequest) {
                        frequest.abort();
                        frequest = false;
                    }
                       
                    if (cancelTimer !== false) {                    
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
                        
                        if (k == 'credentials') continue;
                        
                        if (k == 'formData') {
                           
                            var formData = new FormData();
                            for (var formKey in request.requestCfg.fetchParams.formData) {
                                formData.append(formKey, request.requestCfg.fetchParams.formData[formKey]);
                            }
                            
                            requestParams.body = formData;
                            
                        } else if (k == 'jsonData') {
                                
                            requestParams.headers = {
                              'Accept': 'application/json',
                              'Content-Type': 'application/json'
                            };
                            
                            requestParams.body = JSON.stringify(request.requestCfg.fetchParams.jsonData);
                        
                        } else {
                        
                            requestParams[k] = request.requestCfg.fetchParams[k];
                        }
                    }
                }    
                
                response.ydata = false; 
                
                fetch(request.requestCfg.url, requestParams).then(function(r) {
                    
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
                
                if (request.requestCfg.timeout > 0) {
                    cancelTimer = setTimeout(function() {
                        
                        if (canceled) return;
                    
                        response.error = 'Request timeout [' + request.requestCfg.timeout + ']';
                        onRequestEnd();
                        
                        if (callback) callback(response);
                        
                    }, request.requestCfg.timeout * 1000);
                }
                
                return true; // async mode
            }
            
            if (callback) callback(response); 
    }

    KellyEDispetcher.init();