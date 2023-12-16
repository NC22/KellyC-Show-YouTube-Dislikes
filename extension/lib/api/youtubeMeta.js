KellyShowRate.apiController['youtubeMetric'] =  {
    name : 'YouTube Meta',
    // color : '#ff4949',
    api : 'https://www.youtube.com/watch?v=__VIDEOID__&app=desktop',
    
    helperMode : true,
    
    cfgDefault : {enabled : false, enabledAsHelper : true},
};
        
KellyShowRate.apiController['youtubeMetric'].parseYTPage = function(docRawText) {
    
    var parser = new DOMParser();
    var doc = parser.parseFromString(docRawText, 'text/html');
          
    var publicData = {likes : false, dislikes : false, count : false, rating : false, utDislikes : false, source : 'Rating', likesDisabled : false};
    var pairs = {LIKE : 'likes', DISLIKE : 'dislikes'};
    var scripts = doc.getElementsByTagName('SCRIPT'), counter = doc.querySelector('[itemprop="interactionCount"]'), found = {};
    var parseDataItem = function(item, index) {

       
        if (typeof item.toggleButtonRenderer != 'undefined' && 
            typeof item.toggleButtonRenderer.defaultIcon != 'undefined') {
            item = item.toggleButtonRenderer;
            
            if (item.defaultText.accessibility && typeof pairs[item.defaultIcon.iconType] != 'undefined') {
                
                
                var num = parseInt(item.defaultText.accessibility.accessibilityData.label.replace(/[^0-9]/g,''));
                if (!isNaN(num)) publicData[pairs[item.defaultIcon.iconType]] = num;
                
                // keep title of buttons
            }
        }
    }
    
    if (counter && counter.getAttribute('content')) publicData.count = parseInt(counter.getAttribute('content'));
    for (var i = 0; i < scripts.length; i++) {
        
        if (scripts[i].innerHTML.indexOf('allowRatings') != -1) {
            var pageDataRegExp = /\"allowRatings\"\:(true|false)?/;
            var pageData = pageDataRegExp.exec(scripts[i].innerHTML);
            if (pageData.length > 1) publicData.likesDisabled = pageData[1] != 'true' ? true : false;
        }
        
        if (scripts[i].innerHTML.indexOf('averageRating') != -1) {
            var pageDataRegExp = /\"averageRating\"\:([0-9]*\.[0-9]+|[0-9]+)?/;
            var pageData = pageDataRegExp.exec(scripts[i].innerHTML);
            if (pageData.length > 1) publicData.rating = parseFloat(pageData[1]);
            
            found.rating = true;
        }

        if (scripts[i].innerHTML.indexOf('topLevelButtons') != -1) { 
            
            try {
                
                if (scripts[i].innerHTML.indexOf('defaultNavigationEndpoint') != -1) {
                    var pageDataRegExp = /\"topLevelButtons\"\:\[\{([\s\S]*)defaultNavigationEndpoint/g;
                } else {
                    var pageDataRegExp = /\"topLevelButtons\"\:\[\{([\s\S]*)defaultServiceEndpoint/g;
                }
                
                var pageData = pageDataRegExp.exec(scripts[i].innerHTML);
                
                //console.log(pageData);
                
                //console.log(scripts[i].innerHTML);
                
                var pageDataR =  pageData[0].replace(new RegExp('defaultServiceEndpoint', 'g'), '');
                    pageDataR = '[{' + pageDataR + '}}}}]}]';
                    pageDataR = pageDataR.replace(',"}}}}]}]', '}}}}]}]');
                
                var data = JSON.parse(pageDataR);
                    data = data[0].topLevelButtons[0].segmentedLikeDislikeButtonRenderer;
                    
                    if (!data) break;
                
                    parseData(data.likeButton);

            } catch (e) {
                console.log('Fail to parse page data');
                console.log(e);
            }
            
            found.ld = true;
        }

        if (found.ld && found.rating) break;
    }
    
    if (publicData.dislikes === false && publicData.likes === false && publicData.likesDisabled) {
        publicData.dislikes = 0;
        publicData.likes = 0;
        publicData.disabledReason = 'Vote disabled';
    }
    
    if (publicData.dislikes === false && publicData.rating && publicData.likes) {
        publicData.utDislikesT = Math.round((publicData.likes / publicData.rating) * 5 - publicData.likes); // -- not so accurate
        publicData.utDislikes = Math.round(publicData.likes * ((5 - publicData.rating) / (publicData.rating - 1)));
        publicData.dislikes = publicData.utDislikes;
    }   
    
    // since youtube disable ratings, always return false for dislikes, to prevent overwrite if some junk parsed. 
    // bring only information about likesDisabled \ viewCount \ likes
    
    publicData.dislikes = false;
    publicData.utDislikes = false;
    return publicData; 
}
    
KellyShowRate.apiController['youtubeMetric'].onGetYDataReady = function(handler, requestBg, response, onLoad) {
    
    if (!response.error && response.ydata) response.ydata = KellyShowRate.apiController['youtubeMetric'].parseYTPage(response.ydata);
    else response.ydata = false;
}

KellyShowRate.apiController['youtubeMetric'].onPrepareGetRatingRequestStart = function(handler, requestCfg, onReady) {
    requestCfg.asText = true;
}

KellyStorage.apis['youtubeMetric'] = KellyShowRate.apiController['youtubeMetric'];
