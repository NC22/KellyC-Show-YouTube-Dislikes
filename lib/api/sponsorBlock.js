KellyShowRate.apiController['sponsorsBlock'] = {
    
     name : 'SponsorsBlock Rating API',
     link : 'https://sponsor.ajay.app/', 
     ppLink : 'https://gist.github.com/ajayyy/aa9f8ded2b573d4f73a3ffa0ef74f796',
     
     // api doc : https://wiki.sponsor.ajay.app/w/API_Docs/Ratings
     
     api :  'https://sponsor.ajay.app/api/ratings/rate/__VIDEOIDSHA256__', 
     apiAction :  'https://sponsor.ajay.app/api/ratings/rate',
     
     sync : true,
     
     showZero : true, 
     updateLikes : true,
     
     updateOnActionClick : true,
};

KellyShowRate.apiController['sponsorsBlock'].onGetYDataReady = function(handler, requestCfg, response, onLoad) {
          
      if (response.status == 404) {
          response.error = false; // https://wiki.sponsor.ajay.app/w/API_Docs/Ratings -- 404: No ratings for that type + videoID combination exist
          response.ydata = {likes : 0, dislikes : 0};
          
      } else if (response.status == 200) {
      
        var ydata = {likes : 0, dislikes : 0}; 
        
        for (var i = 0; i < response.ydata.length; i++) {
            
            if (response.ydata[i].videoID && response.ydata[i].videoID.localeCompare(requestCfg.videoId) === 0) {
                
                ydata[response.ydata[i].type == 1 ? 'likes' : 'dislikes'] = response.ydata[i].count;
            }
        }
        
         response.ydata = ydata;
        
      } else {
          response.error = 'Unknown response ' + response.status;
          response.ydata = false;
      }  


      if (response.ydata) {
          
        // Is it possible to track is user already rated video or not via API?
        // We dont know is user already sended his action or no to API on new page load, If an action is setted - send current state
        // so videos that liked \\ disliked before integration with api will also count
        
        // as I tested - we can set both like \\ dislike, but same action can be only one, so dubles is excluded
        // voice counted but refresh page required
        
        var nav = handler.getNavigation(), aState = nav.videoId ? nav.browsingLog[nav.videoId].actionState : false;
        
        if (aState && ['liked', 'disliked'].indexOf(aState) != -1 ) {
            handler.actionRequestInitForApi('sponsorsBlock', nav.browsingLog[nav.videoId].actionState, false, 'sponsorsBlock_API');          
        }
     }      
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
    
    return true;
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
                videoId : requestContext.videoId,
                initiator : requestContext.initiator,
                fetchParams : { 
                    method: 'POST',  
                    jsonData : {                                
                        "videoID" : requestContext.videoId,
                        "userID" : uuidHash,
                        "service" : 'YouTube',
                        "type" : requestContext.type == 'disliked' ? 0 : 1,
                        "enabled" : requestContext.undo ? false : true,
                    },
               },
            };
            
         onReady(cfg);
     });   
     
     return true;
}

KellyStorage.apis['sponsorsBlock'] = KellyShowRate.apiController['sponsorsBlock'];
