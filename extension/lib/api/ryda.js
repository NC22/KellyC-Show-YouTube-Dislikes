KellyShowRate.apiController['ryda'] = {
    
    name : 'Return YouTube Dislike API', 
    link : 'https://returnyoutubedislike.com/', 
    donate : 'https://returnyoutubedislike.com/donate',

    api : 'https://returnyoutubedislikeapi.com/votes?videoId=__VIDEOID__',

    sync : false, // currently not implemented in API
    
    showZero : false, 
    updateLikes : true,
    
    cfgDefault : {
        enabled : true, 
        syncData : true,
    },
}

KellyStorage.apis['ryda'] = KellyShowRate.apiController['ryda'];
