KellyShowRate.apiController['ryda'] = {
    
    name : 'Return YouTube Dislike API', 
    link : 'https://returnyoutubedislike.com/', 
    donate : 'https://returnyoutubedislike.com/donate',

    api : 'https://returnyoutubedislikeapi.com/votes?videoId=__VIDEOID__',

    sync : false, // currently not implemented in API
    
    showZero : false, 
    updateLikes : false,  
    
    helperMode : true,
    helpersSupport : true,
    
    cfgDefault : {
        enabled : true, 
        enabledAsHelper : true,
        syncData : true,
    },
}

KellyShowRate.apiController['ryda'].onGetYDataReady = function(handler, requestCfg, response, onLoad) {
    if (!response || !response.ydata) return;
    
    if (response.ydata.dateCreated) response.ydata.lastUpdate = response.ydata.dateCreated;
    
    response.ydata.likes = parseInt(response.ydata.likes); 
    response.ydata.dislikes = parseInt(response.ydata.dislikes);
    response.ydata.viewCount = parseInt(response.ydata.viewCount);
    if (!isNaN(response.ydata.likes) && !isNaN(response.ydata.dislikes) && !isNaN(response.ydata.viewCount)) {
        
        if (response.ydata.dislikes < 10 && response.ydata.viewCount <= 100) {
            var currentLog = handler.getNavigation().browsingLogCurrent, percent = 100;
            if (currentLog.visibleStats && currentLog.visibleStats.likes > 0) {                
                var percent = response.ydata.likes / (currentLog.visibleStats.likes / 100);
            }  
            
            if (percent < 5) {   
                response.ydata.likes = currentLog.visibleStats.likes;
                response.ydata.disabledReason = "Old data";
                response.ydata.disabledReasonPopup = 'Information about likes \\ dislikes for this video<br> is currently in collecting process.<br>For selected API this can take 1-3 days.';
            }
        }
    }
}

KellyStorage.apis['ryda'] = KellyShowRate.apiController['ryda'];
