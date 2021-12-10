KellyShowRate.apiController['catface'] = { 
    name : "CatFace.ru cache API", 
    link : 'https://catface.ru/',
    api : 'https://catface.ru/api/youtube/?videoId=__VIDEOID__',
    // api : 'https://catface.ru/api/testyoutube2/?videoId=__VIDEOID__',
    // apiAction : 'https://catface.ru/api/testyoutube2/',
        
    // sync : true,
     
    cfgDefault : {enabled : true},
}

KellyShowRate.apiController['catface'].onPrepareActionRequestStart = function(handler, requestContext, onReady) {
    
    KellyTools.getSha256Hash(requestContext.uuid).then(function(uuidHash) {
                 
        if (handler.getNavigation().videoId != requestContext.videoId) {
            onReady(false, 'Request depricated, navigation changed');
            return;
        }
        
        var cfg = handler.getDefaultBGRequest();
            cfg.requestCfg = {
                url : KellyShowRate.apiController['catface'].apiAction,
                asText : true,
                apiId : 'catface',
                videoId : requestContext.videoId,
                initiator : requestContext.initiator,
                fetchParams : { 
                    method: 'POST',  
                    formData : {                                
                        "videoId" : requestContext.videoId,
                        "userId" : uuidHash,
                        "type" : requestContext.type == 'disliked' ? 0 : 1,
                        "enabled" : requestContext.undo ? 0 : 1,
                    },
               },
            };
            
         onReady(cfg);
     });   
     
     return true;
}

KellyStorage.apis['catface'] = KellyShowRate.apiController['catface'];