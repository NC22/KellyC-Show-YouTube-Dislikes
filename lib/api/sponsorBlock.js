KellyShowRate.apiController['sponsorsBlock'] = {
    
     name : 'SponsorsBlock Rating API',
     link : 'https://sponsor.ajay.app/', 
     ppLink : 'https://gist.github.com/ajayyy/aa9f8ded2b573d4f73a3ffa0ef74f796',
     
     // api doc : https://wiki.sponsor.ajay.app/w/API_Docs/Ratings
     
     api :  'https://sponsor.ajay.app/api/ratings/rate/__VIDEOIDSHA256__', 
     apiAction :  'https://sponsor.ajay.app/api/ratings/rate',
     
     sync : true,
     showZero : true,
};

KellyShowRate.apiController['sponsorsBlock'].onGetYDataReady = function(handler, requestBg, response, onLoad) {
    
      if (response.status == 404) {
          response.error = false; // https://wiki.sponsor.ajay.app/w/API_Docs/Ratings -- 404: No ratings for that type + videoID combination exist
          response.ydata = {likes : 0, dislikes : 0};
      }
      
      // todo implement convert recieved data to dislikes \ likes
}

KellyShowRate.apiController['sponsorsBlock'].onPrepareGetRatingRequestStart = function(handler, requestCfg, onReady) {
    
    KellyTools.getSha256Hash(requestCfg.videoId).then(function(hash) {
                
        if (handler.getNavigation().videoId != requestCfg.videoId) {
            handler.log('[prepareRequestStart] environment changed - exit without callback', true);
            return;
        } 
        
        requestCfg.url = requestCfg.url.replace('__VIDEOIDSHA256__', hash.slice(0, 4)); 
        
        onReady(requestCfg); 
    });
}

// [sponsorsBlock] according to https://wiki.sponsor.ajay.app/w/API_Docs/Ratings

KellyShowRate.apiController['sponsorsBlock'].onPrepareActionRequestStart = function(handler, requestContext, onReady) {
    
    KellyTools.getSha256Hash(requestContext.uuid).then(function(uuidHash) {
                 
        if (handler.getNavigation().videoId != requestContext.videoId) {
            onReady(false, 'Request depricated, navigation changed');
            return;
        }
        
        var cfg = handler.getDefaultBGRequest();
            cfg.requestCfg = {
                url : KellyShowRate.apiController['sponsorsBlock'].apiAction,
                asText : true,
                apiId : 'sponsorsBlock',
                context : 'prepareActionRequestStart',
                fetchParams : { 
                    method: 'POST',  
                    jsonData : {                                
                        "videoID" : requestContext.videoId,
                        "userID" : uuidHash,
                        "service" : 'YouTube',
                        "type" : requestContext.type == 'disliked' ? 0 : 1,
                        "enabled" : requestContext.undo ? false : false,
                    },
               },
            };
            
         onReady(cfg);
     });   
     
     return true;
}


// onGetActionDataReady usualy returns response.ydata = 'OK', but that not documented - check response.status == 200 if needed
     
KellyStorage.apis['sponsorsBlock'] = KellyShowRate.apiController['sponsorsBlock'];
