/*

    manifest for any thirdparty API driver
    
    todo 
    
        add custom addition options \ option page callbacks
        add onNavigation event callback
*/

KellyShowRate.apiController['API_ID'] = {
     
     name : 'title', // API title for options page
     link : 'URL', // home page url
     ppLink : 'URL', // privacy policy url
   
     api : 'URL', // request rating api url - used for generate default config 
     apiAction :  'URL', // action api url - used for generate default config
     
     sync : true, // is api support action api
     
     // for apis that not use youtube api and have independed database
     
     showZero : true, // show ratiobar for items with zero data [likes : 0 | dislikes : 0]    
     updateLikes : false, // update likes text (todo)
     
     // timeouts \ limits
     
     maxAttempts : 3, // max requests
     nextDriverTimeout : 200, // wait before shutdown on FAIL
     rTimeout : 2, // request timeout
     
     updateOnActionClick : false,
}

/* 
    
    Calls on get rating request result. 
    
    
    requestCfg - same as in onPrepareGetRatingRequestStart
    
    
    on success
    
    onReady([response object])
    
    response json \ text by default stored in "ydata" key. 
    It must contain dislikes \ likes associative array {likes : int, dislikes : int }
    
    on fail 
        
    onReady(false, errorText)
    
*/

KellyShowRate.apiController['API_ID'].onGetYDataReady = function(handler, requestCfg, response, onReady) {
    
    // use response without modification 
    
    return true; // async mode - call onReady when data ready
}

/*    
    Calls before rating request, to configure fetch controller

    Default config :
    
    var requestCfg = {
        
        // context strings :
        
        apiId : handler.currentApi,
        context : 'prepareRequestStart',        
        videoId : videoId,
        
        // request :
        
        asText : false, // get response as text (by default try to read json)
               
        url : KellyStorage.apis[handler.currentApi].api.replace('__VIDEOID__', videoId),
        
        maxAttempts : apiCfg.maxAttempts ? apiCfg.maxAttempts : 3,
        nextDriverTimeout : typeof apiCfg.nextDriverTimeout != 'undefined' ? apiCfg.nextDriverTimeout : 500,
        timeout : apiCfg.rTimeout ? apiCfg.rTimeout : handler.cfg.rTimeout,
        
        fetchParams : apiCfg.fetchParams ? apiCfg.fetchParams : false, 
    };
    
    fetchParams used for fetch(fetchParams) method
    
    additionaly accepts fetchParams.formData = {} - sets body to fetchParams.body = formData object for POST data send
    additionaly accepts fetchParams.jsonData = {} - sets headers to content type json, sets body to fetchParams.body = JSON.stringify(fetchParams.jsonData)
            
    on success return modified \ same requestCfg
    
    onReady(requestCfg)
    
    response object must contain "ydata" key contained dislikes \ likes in format {likes : int, dislikes : int }
    
    on fail 
        
    onReady(false, errorText)
*/

KellyShowRate.apiController['API_ID'].onPrepareGetRatingRequestStart = function(handler, requestCfg, onReady) {
    
     return true; // async mode - call onReady when data ready
}

/*
    Calls before action request. Must return to onReady params array if action request supported
    
         
    var requestContext = {videoId : lastVideoId, uuid : getUserId(), type : type, undo : undo, apiId : apiId, initiator : initiator - "button_click" - by default call from click on buttons};
         
    on success must contain request params - requestCfg
    
    onReady(requestCfg)
        
    on fail 
        
    onReady(false, errorText)
*/

KellyShowRate.apiController['API_ID'].onPrepareActionRequestStart = function(handler, requestContext, onReady) {
     return true; // async mode - call onReady when data ready
}

// requestCfg - config created in onPrepareActionRequestStart based on requestContext

KellyShowRate.apiController['API_ID'].onGetActionDataReady(handler, response, requestCfg, onReady) {
     return true; // async mode - call onReady when data ready
}

KellyStorage.apis['API_ID'] = KellyShowRate.apiController['API_ID'];