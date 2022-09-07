/* 
    @encoding       utf-8
    @name           kellyShowRate
    @namespace      Kelly
    @description    Show dislikes
    @author         Rubchuk Vladimir <torrenttvi@gmail.com>
    @license        GPLv3

*/

function KellyShowRate() {

    var lastVideoId = false;    // last loaded video id, can be erased on load new page  
    var lastVideoYData = false; // valid data for current video, can be erased on load new page  
    var browsingLog = {};       // cache visited videos until page reload
    
    var updateTimer = false; var initTimer = false;
    var ldAction = {liked : 'likes', disliked : 'dislikes'}; // valid action request types
    var domSelectors = {
        mobile : {btnsWrap : '.slim-video-action-bar-actions', btnCounter : '.button-renderer-text', ratioHeight : 5, ratioBp : 0, ratioParent : 'ytm-slim-video-action-bar-renderer'},
        desktop : {btnsWrap : '#menu-container #top-level-buttons-computed', btnCounter : '#text', btnCounterSegmented : 'span[role="text"]', ratioHeight : 5, ratioBp : 8, ratioParent : '#menu-container'},
        shorts : {shortsContainer : '#shorts-container ytd-reel-video-renderer', btnsWrap : '#like-button ytd-like-button-renderer', ratioWrapBefore : '#like-button', btnCounter : '#text'}, 
        shortsMobile : {shortsContainer : '#player-shorts-container .carousel-item', btnsWrap : 'ytm-like-button-renderer', ratioWrapBefore : 'ytm-like-button-renderer', btnCounter : '.button-renderer-text'}, 
        desktopUpgrade : {btnsWrap : '#above-the-fold #menu #top-level-buttons-computed', btnCounter : '#text', ratioHeight : 5, ratioBp : 8, ratioParent : '#above-the-fold #actions-inner'},
    };
    
    var handler = this; // todo - remove tpl vars from public
        
        handler.shortsMode = false;
        handler.cfg = {}; // loads on init method
        handler.attempt = 0;
        handler.baseClass = 'kelly-show-rating';
        handler.envSelectors = false;

        handler.ratioBar = false;
        handler.ratioBarTpl = '<div class="' + handler.baseClass + '-ratio-like"></div><div class="' + handler.baseClass + '-ratio-dislike"></div>';
        
        handler.bgFailTpl = '<div style="position:absolute;top:30px;background: #cc0000;color: #fff;padding: 4px;left: 26px;">' + KellyTools.getLoc('restart_bg_required') + '</div>';
        
        handler.dislikeBtn = false;
        handler.likeBtn = false;
        handler.ytRequest = false;
        
        handler.requestsCfg = {
            
            enabledApis : [],
            helperApis : [],
            
            loops : 1, // maxAttempts per loop default = 2
            loopsMax : -1, // max change driver attempts -1 = drivers.length * 3
        }
        
    this.getDefaultBGRequest = function() {
        return { method: "getYoutubeInfo" };
    }
    
    this.getDefaultBrowsingLog = function() {
        return {actionState : getRatingState(), helperYdata : {}, ydata : false};
    }
    
    function isDarkTheme() {
        return document.documentElement.getAttribute('dark') == 'true';
    }
    
    function isMobile() {
        return window.location.href.indexOf('m.youtube') != -1;
    }
    
    function isShorts() {
        return handler.shortsMode;
    }
    
    function getVideoId(href) {          
        
        handler.shortsMode = false;
        href = href ? href : window.location.href;
        if (!href) return false;
        
        href = href.replace('app=desktop&', '');
        var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;        
        var match = href.match(regExp);
        
        if (match && match[7].length==11) return match[7];

        if (href.indexOf('shorts') != -1) {
            
            var regExp = /(shorts\/)([-_A-Za-z0-9]+){0,11}/;
            var match = href.match(regExp);
            if (match && match[2].length==11) {
                handler.shortsMode = true;
                return match[2];
            }
        }
        
        return false;
    }
    
    // get uniq id for user, used for send actions to likes \ dislikes database provider
    
    function getUserId() { 
    
        var scripts = document.getElementsByTagName('SCRIPT');

        for (var i = 0; i < scripts.length; i++) {
            if (scripts[i].innerHTML.indexOf('browseId') != -1) {
                
                // mobile version encodes script containers in some way
                var encoded = scripts[i].innerHTML.indexOf('\\x5b\\x7b\\x22') != -1;
                var pageDataRegExpEncoded = /\\x22browseId\\x22\:\\x22([-_A-Za-z0-9]+)\\x22?/;
                
                var pageDataRegExp = /\"browseId\"\:\"([-_A-Za-z0-9]+)\"?/;
                var pageData = encoded ? pageDataRegExpEncoded.exec(scripts[i].innerHTML) : pageDataRegExp.exec(scripts[i].innerHTML);
                
                if (pageData) return pageData[1];
                else return false;
            } 
        }
        
        return false;
    } 
    
    function getRatingState() {
             if (!handler.buttonsWraper) return 'unkonwn';
        else if (handler.buttonsWraper.children[0].querySelector('[aria-pressed=true]')) return 'liked';
        else if (handler.buttonsWraper.children[1].querySelector('[aria-pressed=true]')) return 'disliked';
        else return 'neutral';
    } 
    
    // update information about current main page placeholders - buttonsWraper, ratioBarParent elements - used to put sentimentbar and update counters on buttons
    
    function initSelectors() {
       
        if (isShorts()) {
            
            if (isMobile()) return; // mobile UI updates glitchy, not used \ supported full now
            
            handler.envSelectors = domSelectors[isMobile() ? 'shortsMobile' : 'shorts'];
            var shortsVideos = document.querySelectorAll(handler.envSelectors.shortsContainer), videoId = getVideoId();
        
            for (var i = 0; i < shortsVideos.length; i++) {
                
                if (shortsVideos[i].innerHTML.indexOf(videoId) != -1 && KellyTools.isElInViewport(shortsVideos[i])) {
                    handler.buttonsWraper = shortsVideos[i].querySelector(handler.envSelectors.btnsWrap);                    
                    handler.ratioBarParent = shortsVideos[i].querySelector('.' + handler.baseClass + '-shrots-ratio-bar-wrap');
                    
                    if (!handler.cfg.showRatioShortsEnabled) {
                        
                        // disabled
                        
                    } else if (!handler.envSelectors.ratioWrapBefore) {
                        
                        handler.log('No ratioWrapBefore setted, skip ratiobar setup', true);
                        
                    } else {
                        
                        if (!handler.ratioBarParent) {
                            
                            var likesBtn = shortsVideos[i].querySelector(handler.envSelectors.ratioWrapBefore);
                            if (likesBtn) {
                                
                                handler.ratioBarParent = document.createElement('DIV');
                                handler.ratioBarParent.className = handler.baseClass + '-shrots-ratio-bar-wrap';
                                likesBtn.parentElement.insertBefore(handler.ratioBarParent, likesBtn);
                            }
                        
                        }
                        
                    }
                    
                    break;
                }
            }
            
        } else {
            
                
                handler.envSelectors = domSelectors[isMobile() ? 'mobile' : 'desktop']; 
                handler.envSelectors.ratioHeight = handler.cfg.fixedRatioHeightEnabled ? handler.cfg.fixedRatioHeight : handler.envSelectors.ratioHeight;
                handler.envSelectors.ratioWidthFixed = handler.cfg.fixedRatioWidthEnabled ? handler.cfg.fixedRatioWidth : false;
                
                // possible custom style
                var upgrade = document.querySelector('#primary ytd-watch-metadata');     
                if (!isMobile() && upgrade && !upgrade.hidden && !upgrade.hasAttribute('disable-upgrade') && document.querySelector(domSelectors['desktopUpgrade'].btnsWrap)) { 
                    handler.envSelectors = domSelectors['desktopUpgrade'];          
                }
                
                if (handler.envSelectors.btnsWrap) {
                    handler.buttonsWraper = document.querySelector(handler.envSelectors.btnsWrap);
                    
                    // possible custom style of buttons 
                    if (handler.envSelectors.btnCounterSegmented && handler.buttonsWraper && handler.buttonsWraper.children.length > 0 && handler.buttonsWraper.children[0].tagName.toLowerCase().indexOf('ytd-segmented-like-dislike-button-renderer') != -1) {
                        handler.buttonsWraper = handler.buttonsWraper.children[0];
                        handler.envSelectors.btnCounter = handler.envSelectors.btnCounterSegmented;
                    } 
                }
                
                if (handler.envSelectors.ratioParent) {
                    handler.ratioBarParent = document.querySelector(handler.envSelectors.ratioParent);
                }
                
        }
         
    }
        
    function getPageDom() { 
    
        initSelectors();
        
        if (handler.buttonsWraper) {
            handler.likeBtn = handler.buttonsWraper.children[0].querySelector(handler.envSelectors.btnCounter);
            handler.dislikeBtn = handler.buttonsWraper.children[1].querySelector(handler.envSelectors.btnCounter);
        } else {
            handler.log('No buttonsWraper detected', true);
        }
    
        // prevents update counters by external scripts
        //
        // youtube renderer redraw likes counter in some cases even if navigation already finished - mostly in mobile, currently this method not helps very much and redraw still required very friquently
        
        if (handler.buttonsWraper && !handler.protectCounters) {
            handler.protectCounters = new MutationObserver(function(mutations) {
                
                for (var i = 0; i < mutations.length; i++) {
                                              
                    if (mutations[i].type == 'childList' &&
                       ((handler.currentApi && KellyStorage.apis[handler.currentApi].updateLikes && mutations[i].target == handler.likeBtn) || mutations[i].target == handler.dislikeBtn) && 
                        mutations[i].addedNodes.length > 0 && 
                        mutations[i].addedNodes[0].nodeType == Node.TEXT_NODE) {                                
                        mutations[i].addedNodes[0].textContent = '';
                    }  
                }
            });
            
            handler.protectCounters.observe(handler.buttonsWraper, {childList: true, subtree: true});
        }
        
        return !handler.dislikeBtn ? false : true;
    }   
        
    function updateRatioWidth() {
         
         if (!handler.ratioBar) return;
         
         if (isShorts()) { // unconfigurable, setted in css
         
             handler.ratioBar.style.width = '';
             
         } else {
         
             if (isMobile()) {
                       
               handler.ratioBarMaxWidth = 146; 
                       
             } else if (!handler.envSelectors.ratioWidthFixed && handler.buttonsWraper && handler.buttonsWraper.children.length > 1) {
                  
                var paddingEl = handler.buttonsWraper.children[1].querySelector('A');
                var totalPadding = 0;  
                
                handler.ratioBarMaxWidth = handler.buttonsWraper.children[0].clientWidth + handler.buttonsWraper.children[1].clientWidth;
                                  
                if (paddingEl) {
                    totalPadding += parseInt(window.getComputedStyle(paddingEl).paddingRight);
                }
                
                handler.ratioBarMaxWidth -= totalPadding;       
                
                if (handler.ratioBarMaxWidth < 60) handler.ratioBarMaxWidth = 150;
                if (handler.ratioBarMaxWidth > 210) handler.ratioBarMaxWidth = 210;
                
                if ( handler.cfg.ratioXoffsetEnabled ) handler.ratioBar.style.left = handler.cfg.ratioXoffset + 'px';
                else handler.ratioBar.style.left = '';
                
                if ( handler.cfg.ratioYoffsetEnabled ) handler.ratioBar.style.top = handler.cfg.ratioYoffset + 'px';
                else handler.ratioBar.style.top = '';
                
            } else if (handler.envSelectors.ratioWidthFixed) {
                
                handler.ratioBarMaxWidth = handler.envSelectors.ratioWidthFixed;
            }
            
            if (handler.ratioBarMaxWidth) handler.ratioBar.style.width = handler.ratioBarMaxWidth + 'px';
            
        }
    }
        
    function updateRatio() {
        
        if (!handler.cfg.showRatioEnabled || !handler.buttonsWraper) return;
        
        var ydata = lastVideoYData, barCl = handler.baseClass + '-ratio-bar';
        
        handler.ratioBar = document.getElementsByClassName(handler.baseClass + '-ratio-bar');
        handler.ratioBar = handler.ratioBar.length <= 0 ? document.createElement('DIV') : handler.ratioBar[0];
        KellyTools.setHTMLData(handler.ratioBar, handler.ratioBarTpl);      
        
        likeEl = handler.ratioBar.getElementsByClassName(handler.baseClass + '-ratio-like')[0];
        dlikeEl = handler.ratioBar.getElementsByClassName(handler.baseClass + '-ratio-dislike')[0];
        
        handler.ratioBar.className = barCl + ' ' + (isMobile() ? barCl + '-mobile ' : '') + (ydata ? '' : barCl + '-load ');
        
        /* Addition class if "Comments Sidebar for Youtube" extension enabled [Fix] */
        
        if (document.getElementById('warc-app')) {
            
            handler.envSelectors.ratioBp = 0; 
            handler.ratioBar.style.marginTop = (4 - handler.envSelectors.ratioHeight) + 'px';
            
            handler.ratioBar.className += ' ' + barCl + '-warc'; 
            handler.cfg.popupAvoidBoundsEnabled = false;
        }

        if (ydata) {
            
            var percent = (ydata.likes + ydata.dislikes) / 100, api = handler.cfg.apis.cfg[ydata.apiId];
            
            if (ydata.likes > 0 || ydata.dislikes > 0) {
                
                likeEl.style.width = (ydata.likes / percent).toFixed(2) + '%';        
                dlikeEl.style.width = (ydata.dislikes / percent).toFixed(2) + '%';
            }
            
            if (api.ratioLikeColor) likeEl.style.backgroundColor = api.ratioLikeColor;
            if (api.ratioDislikeColor) dlikeEl.style.backgroundColor = api.ratioDislikeColor;
        }
        
        likeEl.style.height = handler.envSelectors.ratioHeight + 'px';
        dlikeEl.style.height = handler.envSelectors.ratioHeight + 'px';
        if (handler.envSelectors.ratioBp) handler.ratioBar.style.paddingTop = (handler.envSelectors.ratioBp - handler.envSelectors.ratioHeight) + 'px';
        
        updateRatioWidth();
        if (!handler.ratioBarParent) return handler.log('Skip ratiobar addition - Cant read ratio bar parrent - ' + handler.envSelectors.ratioParent, true);
        handler.ratioBarParent.appendChild(handler.ratioBar); 
                
        handler.ratioBar.onmouseover = function(e){
            if (handler.getTooltip().beasy) return;
            showTip(e);
        }
        
        handler.ratioBar.onclick = function(e){
            
            if (handler.cfg.showSourceEnabled || KellyTools.DEBUG) showTip(e, true);            
            e.stopPropagation();
            return false;
        }
        
        handler.ratioBar.onmouseout = function(e) {
            if (handler.getTooltip().beasy) return;
            var related = e.toElement || e.relatedTarget;
            if (handler.getTooltip().isChild(related)) return;
            
            handler.getTooltip().show(false);
        }
    }
    
    function getYTData(cfg, onLoad) {
        
        handler.log('begin query to : ' + cfg.url, true);
        
        var bgRequest = new Object();
            bgRequest.abort = function(silent) {
                handler.log('[getYTData] Reset data request controller', true);
                bgRequest.canceled = true;
            }
            
        var requestBg = handler.getDefaultBGRequest();
            requestBg.requestCfg = cfg;
            
        KellyTools.getBrowser().runtime.sendMessage(requestBg, function(response) {
            
              if (bgRequest.canceled) return;
              
              if (KellyShowRate.apiController[cfg.apiId].onGetYDataReady && 
                  KellyShowRate.apiController[cfg.apiId].onGetYDataReady(handler, requestBg.requestCfg, response, onLoad) === true) {
                  return; // need more preparations on driver side - async mode
              }
              
              if (response.ydata) {
                  
                  response.ydata.apiId = cfg.apiId;
                  onLoad(response.ydata);
                  
              } else {
                  
                  onLoad(false, '[getYTData] error : ' + response.error); 
              }  
        });
        
        return bgRequest;
    }
    
    // configurates request according to driver settings
    
    function prepareRequestStart(force, onReady) {
        
        if (handler.requestsCfg.loops > handler.requestsCfg.loopsMax) { 
            // if (handler.ratioBar) showTip(false, true);
            return onReady(false, 'max requests loops reached ' + handler.requestsCfg.loops);
        }
        
        // extension conflict \\ youtube already shows data for video for owner or in other cases - skip
        
        if (document.getElementById('sentiment') && !document.getElementById('sentiment').hidden) {
            return onReady(false, 'some sentiment data already exist');
        };
        
        var videoId = getVideoId();
        if (!videoId) {
            return onReady(false, 'cant detect videoId id');
        }
                
        // already rendered
        
        if (!force && lastVideoId == videoId) {
            return onReady(false, 'same video id - skip : ' + lastVideoId);
        }
        
        getPageDom();
        lastVideoId = videoId;
        lastVideoYData = false;
        updateRatio();
        
        if (!browsingLog[videoId]) browsingLog[videoId] = handler.getDefaultBrowsingLog();
        
        if (handler.ytRequest) handler.ytRequest.abort();
         
        // check history data before request - clean history if needed before request
       
        if (browsingLog[videoId].ydata && showYData(browsingLog[videoId].ydata, 'redraw.existData')) {
            
            if (isShorts()) {
                 setTimeout(function() {
                     
                     if ( lastVideoId == videoId ) {
                        getPageDom();
                        showYData(browsingLog[videoId].ydata, 'redraw.existData');
                     }
                     
                 }, 1000);
            }
            
            return onReady(false, 'data already loaded before : ' + lastVideoId);
        }
        
        var apiCfg = KellyStorage.apis[handler.currentApi];
        
        var requestCfg = {
            
            apiId : handler.currentApi,
            context : 'prepareRequestStart',
            videoId : videoId, 
            url : KellyStorage.apis[handler.currentApi].api.replace('__VIDEOID__', videoId),
            maxAttempts : apiCfg.maxAttempts ? apiCfg.maxAttempts : 2,
            nextDriverTimeout : typeof apiCfg.nextDriverTimeout != 'undefined' ? apiCfg.nextDriverTimeout : 500,            
            timeout : apiCfg.rTimeout ? apiCfg.rTimeout : handler.cfg.tTimeout,
            fetchParams : apiCfg.fetchParams ? apiCfg.fetchParams : false, // default GET request without coockies
        };
        
        if (!KellyShowRate.apiController[handler.currentApi].onPrepareGetRatingRequestStart ||
            KellyShowRate.apiController[handler.currentApi].onPrepareGetRatingRequestStart(handler, requestCfg, onReady) !== true) {
                onReady(requestCfg); // sync mode  
        }
    }
    
    function applyData(ydata, context) {
        
        var newData = validateYData(ydata); 
        if (newData && !newData.helperApiId) {       
            
            browsingLog[lastVideoId].ydata = newData;
            browsingLog[lastVideoId].origYData = {likes : newData.likes, dislikes : newData.dislikes};
            browsingLog[lastVideoId].actionState = getRatingState();
            
            if (browsingLog[lastVideoId].actionState && ldAction[browsingLog[lastVideoId].actionState]) {
                if (browsingLog[lastVideoId].origYData[ldAction[browsingLog[lastVideoId].actionState]] <= 0) {
                    browsingLog[lastVideoId].origYData[ldAction[browsingLog[lastVideoId].actionState]] = 1;
                }
            }
        
        } else if (newData) browsingLog[lastVideoId].helperYdata[newData.helperApiId] = newData;
        
        if (ydata && ydata.apiId == 'youtubeMetric' && ydata.disabledReason) browsingLog[lastVideoId].ydata.disabledReason = ydata.disabledReason;
        
        if (newData && browsingLog[lastVideoId].origYData) {
            
            browsingLog[lastVideoId].ydata.likes = browsingLog[lastVideoId].origYData.likes;
            browsingLog[lastVideoId].ydata.dislikes = browsingLog[lastVideoId].origYData.dislikes;
            
            // count addition data from helper sources
            for (var helperApiId in browsingLog[lastVideoId].helperYdata) {  
            
                browsingLog[lastVideoId].ydata.likes += browsingLog[lastVideoId].helperYdata[helperApiId].likes;
                browsingLog[lastVideoId].ydata.dislikes += browsingLog[lastVideoId].helperYdata[helperApiId].dislikes;
            }
        }
        
        handler.log('[' + ydata.apiId + '] result data : ', true);
        handler.log(ydata, true);
        
        return showYData(browsingLog[lastVideoId].ydata, context ? context : 'getYTData.newData');
    }
    
    function prepareHelper(driver, parentCfg, onReady) {
        
        var apiCfg = KellyStorage.apis[driver];
        
        var requestCfg = {
            apiId : driver,
            parentApiId : parentCfg.apiId,
            context : 'prepareHelper',
            videoId : parentCfg.videoId, 
            url : apiCfg.api.replace('__VIDEOID__', parentCfg.videoId),       
            timeout : apiCfg.rTimeout ? apiCfg.rTimeout : handler.cfg.tTimeout,
            fetchParams : apiCfg.fetchParams ? apiCfg.fetchParams : false, 
        };
        
        if (!KellyShowRate.apiController[driver].onPrepareGetRatingRequestStart ||
            KellyShowRate.apiController[driver].onPrepareGetRatingRequestStart(handler, requestCfg, onReady) !== true) {
                onReady(requestCfg); // sync mode  
        }
    }
    
    // universal driver that holds [returnyoutubedislikes \ catface \ youtube \ sponsorsBlock] requests
    
    function updatePageStateByAR(force, attempt) {
        
        var cfg = KellyStorage.apis[handler.currentApi];
        
        if (!attempt) attempt = 1;
        
        handler.log('[updatePageStateByAR][' + handler.currentApi + '] prepare to request', true); 
                
        prepareRequestStart(force, function(requestCfg, notice) {
                
            if (!requestCfg) {
                
                return handler.log('[updatePageStateByAR][Skip request] ' + notice, true);
                
            } else if (requestCfg.ydata && applyData(requestCfg.ydata, 'getYTData.prefetchedByApiData')) return;
            
            // sync helpers requests
            
            if (KellyStorage.apis[handler.currentApi].helpersSupport) { 
                for (var i = 0; i < handler.requestsCfg.helperApis.length; i++) {
                    
                    if (handler.requestsCfg.helperApis[i] == handler.currentApi) continue;
                    
                    prepareHelper(handler.requestsCfg.helperApis[i], requestCfg, function(helperRequestCfg, notice) {
                        if (!helperRequestCfg) {
                            return handler.log('[HelperRequest][Helper request FAIL] ' + notice, true);
                        } else if (helperRequestCfg.ydata) {
                            helperRequestCfg.ydata.helperApiId = helperRequestCfg.apiId;
                            if (helperRequestCfg.videoId == lastVideoId && applyData(helperRequestCfg.ydata, 'getYTData.prefetchedByHelperApiData')) return;
                        }
                        
                        getYTData(helperRequestCfg, function(helperYdata, error) {
                            
                            handler.log('[HelperRequest] Helper : ' + helperRequestCfg.apiId + ' | Parent : ' + helperRequestCfg.parentApiId + ' Result : ' + (error ? 'FAIL ' + error : 'OK'), true);
                            if (helperRequestCfg.videoId == lastVideoId && helperYdata) {       
                            
                                helperYdata.helperApiId = helperRequestCfg.apiId;
                                
                                if (KellyStorage.apis[helperRequestCfg.parentApiId].onHelperData) {
                                    KellyStorage.apis[helperRequestCfg.parentApiId].onHelperData(handler, helperRequestCfg, helperYdata);
                                }
                                
                                applyData(helperYdata, 'getYTData.fetchedByHelperApiData');
                            }
                        });
                    });
                    
                }
            }
            
            // sync helper requests end
            
            handler.log('[updatePageStateByAR] update [' + attempt + '/' + requestCfg.maxAttempts + '] [loop : ' + handler.requestsCfg.loops + ']', true)
            
            handler.ytRequest = getYTData(requestCfg, function(ydata, error) {
                
                getPageDom();     
                handler.ytRequest = false;
                if (!error && !applyData(ydata)) {
                    error = 'dataParserError'; // parser deprecated ? - imidiatly go to api methods
                    attempt = requestCfg.maxAttempts;
                    handler.log('[updatePageStateByAR] parser deprecated or data not available | next in ms' + requestCfg.nextDriverTimeout, true);
                } 

                if (error) {
                    
                    if (attempt + 1 <= requestCfg.maxAttempts) {
                    
                        handler.log('[updatePageStateByAR][FAIL] ' + error, true);
                        updatePageStateByAR(true, attempt + 1);
                        
                    } else setTimeout(function() { browsingLog[lastVideoId].helperYdata = {}; updatePageState(true); }, requestCfg.nextDriverTimeout);     
                }         
            });
        });
        
    }
    
    /*
        sync action data with available APIs        
    */    
    
    function prepareActionRequestStart(apiId, type, undo, initiator, onReady) {
                  
         handler.log('[actionRequest][' + apiId + '] : prepare request ' + type + ' | ' + (undo ? 'UNDO' : 'NEW'), true);        
        
         if (!KellyStorage.apis[apiId].sync) {
             onReady(false, 'Sync data not supported by API ' + apiId);
             return;
         }
         
         var requestContext = {videoId : lastVideoId, uuid : getUserId(), type : type, undo : undo, apiId : apiId, initiator : initiator};
         
         if (!requestContext.uuid || !requestContext.videoId || requestContext.type == 'neutral' || !browsingLog[requestContext.videoId]) {
             onReady(false, 'Not enough input data for [Vote] action : ' + JSON.stringify(requestContext));
             return;
         }
         
         if (!KellyShowRate.apiController[apiId].onPrepareActionRequestStart || KellyShowRate.apiController[apiId].onPrepareActionRequestStart(handler, requestContext, onReady) !== true) {
            onReady(false, 'prepareActionRequestStart not implemented for API ' + apiId); // sync mode
         }
    }
    
    // checks if API support actions and if user allow send his actions to API
    
    this.actionRequestInitForApi = function(apiId, type, undo, initiator, onReady) {
        
        if (!KellyStorage.apis[apiId].sync || !handler.cfg.apis.cfg[apiId].syncData) return false;
        
        prepareActionRequestStart(apiId, type, undo, initiator, function(requestBgCfg, error) {
            
            if (!requestBgCfg) return handler.log('[actionRequest] Fail to create request config : ' + (error ? error : 'error not specifed'), true);
                            
            KellyTools.getBrowser().runtime.sendMessage(requestBgCfg, function(response) {
                    
                  // currently no any postprocessing needed, just log errors
                  
                  if (KellyShowRate.apiController[apiId].onGetActionDataReady && 
                      KellyShowRate.apiController[apiId].onGetActionDataReady(handler, response, requestBgCfg.requestCfg, onReady) !== false) {
                      if (onReady) onReady(response);
                  }  
                  
                  if (response.error) handler.log('[actionRequest] ' + apiId + ' | [' + initiator + '][' + type + '] Request error : ' + response.error, true);  
                  else handler.log('[actionRequest] Action accepted ' + apiId + ' | [' + initiator + '][' + type + '] [' + (undo ? 'UNDO' : 'SET') + ']', true);
            }); 
          
        });
    }
    
    function actionRequest(newAction, initiator) {
        
        if (!newAction || newAction == 'unkonwn' || !lastVideoId || !browsingLog[lastVideoId]) return false;
        
        handler.log('[actionRequest] : Update rating action state from [' + browsingLog[lastVideoId].actionState + '] to [' + newAction + ']', true);
        
        var oldAction = ldAction[browsingLog[lastVideoId].actionState] && newAction != browsingLog[lastVideoId].actionState ? browsingLog[lastVideoId].actionState : false;
        var neutral = newAction == 'neutral' ? true : false;
        
        browsingLog[lastVideoId].actionState = newAction;
        
        if (browsingLog[lastVideoId].origYData) {
            
            if (oldAction && browsingLog[lastVideoId].origYData[ldAction[oldAction]] > 0) browsingLog[lastVideoId].origYData[ldAction[oldAction]]--;
            if (ldAction[newAction]) browsingLog[lastVideoId].origYData[ldAction[newAction]]++;
            
            browsingLog[lastVideoId].ydata.likes = browsingLog[lastVideoId].origYData.likes;
            browsingLog[lastVideoId].ydata.dislikes = browsingLog[lastVideoId].origYData.dislikes;
            
            applyData(browsingLog[lastVideoId].ydata, 'recalc');
        }
                
        for (var apiId in KellyStorage.apis) { // two actions possible if we change action from like to dislike for ex. | if return to netural - only one action called
        
            if (oldAction) handler.actionRequestInitForApi(apiId, oldAction, true, initiator + '_old_action_' + (neutral ? '_to_neutral' : ''));
            if (ldAction[newAction]) handler.actionRequestInitForApi(apiId, newAction, false, initiator); 
        }
    }
    
    function validateYData(ydata) {
        
       if (ydata && typeof ydata.dislikes != 'undefined') {
          
           if (ydata.dislikes === false) {
                handler.log('empty YData dislikes info', true);
                ydata = false;
                
           } else {
          
               ydata.dislikes = parseInt(ydata.dislikes);
               ydata.likes = parseInt(ydata.likes);
               
               if (isNaN(ydata.dislikes) || isNaN(ydata.likes)) {
                   handler.log('cant validate YData', true);
                   ydata = false;
               } else {
                    if (ydata.likes < 0) ydata.likes = 0;
                    if (ydata.dislikes < 0) ydata.dislikes = 0;
               }
           }
           
       } else {
           handler.log('empty YData', true);
           ydata = false;
       }
       
       return ydata;
    }
    
    function updateCounter(type, counterEl, val, mark) {
        
        var holder = document.getElementsByClassName(handler.baseClass + '-' + type);
        if (holder.length <= 0) holder = document.createElement('span');
        else holder = holder[0];
        
        holder.className = handler.baseClass + '-' + type + (isMobile() ? ' ' + handler.baseClass + '-counter-mobile ' : '') + (mark ? ' ' + handler.baseClass + '-counter-long' : '');
        
        if (val === false) {
            holder.innerHTML = ''; 
        } else {
            counterEl.innerHTML = '';
            counterEl.appendChild(holder); 
            KellyTools.setHTMLData(holder, val);
        }
    }
    
    function showYData(ydata, callerId) {
        
        handler.log('[showYData] show YData [' + callerId + ']', true);
        
        lastVideoYData = validateYData(ydata); 
        if (lastVideoYData && getPageDom()) {
                        
            handler.dislikeBtn.style.opacity = 1;
            var api = KellyStorage.apis[lastVideoYData.apiId], updateLikes = api && api.updateLikes;

            if (lastVideoYData.disabledReason) {
                
                updateCounter('like', handler.likeBtn, false);                
                updateCounter('dislike', handler.dislikeBtn, lastVideoYData.disabledReason == 'Old data' ? lastVideoYData.dislikes + ' (?)' : lastVideoYData.disabledReason, true);
                updateRatio();
                
            } else {
                
                updateCounter('like', handler.likeBtn, updateLikes ? KellyTools.nFormat(lastVideoYData.likes) : false);                
                updateCounter('dislike', handler.dislikeBtn, KellyTools.nFormat(lastVideoYData.dislikes));
                updateRatio();
                
                setTimeout(updateRatioWidth, 500);
            }  

            return true;
            
       } else return false;
    }
            
    function initCss() {
        if (document.getElementById(handler.baseClass + '-mainCss')) return;
        
        KellyTools.updateCss(handler.baseClass + '-mainCss', '.' + handler.baseClass + '-ratio-bar { display : none;}');
        
        handler.log('[initCss] Load resources from BG', true);
        KellyTools.getBrowser().runtime.sendMessage({
            method: "getCss", 
        }, function(response) {
            
            if (KellyTools.getBrowser().runtime.lastError || typeof response == 'undefined' || typeof response.css == 'undefined') {   
                handler.log('[initCss] fail request css - check bg process', true);
                return;
            } 
            
            response.css = KellyTools.replaceAll(response.css, '__BASECLASS__', handler.baseClass);
          
            var baseClassLike = ' .' + handler.baseClass + '-ratio-bar .' + handler.baseClass + '-ratio-like';
            var baseClassDislike = ' .' + handler.baseClass + '-ratio-bar .' + handler.baseClass + '-ratio-dislike';
            var baseClassLoading = ' .' + handler.baseClass + '-ratio-bar.' + handler.baseClass + '-ratio-bar-load .' + handler.baseClass + '-ratio-like,';
                baseClassLoading += ' .' + handler.baseClass + '-ratio-bar.' + handler.baseClass + '-ratio-bar-load .' + handler.baseClass + '-ratio-dislike';
                
            if (handler.cfg.ratioLikeColor) response.css += baseClassLike + ' { background : ' +  handler.cfg.ratioLikeColor + '}' + "\n\r";
            if (handler.cfg.ratioDislikeColor) response.css += baseClassDislike + ' { background : ' +  handler.cfg.ratioDislikeColor + '}' + "\n\r";
            if (handler.cfg.ratioLoadingColor) response.css += baseClassLoading + ' { background : ' + handler.cfg.ratioLoadingColor + '}' + "\n\r";
            
            KellyTools.updateCss(handler.baseClass + '-mainCss', response.css);        
        });
    }
    
    function showRetryForm(el, html, loadFail) {
    
        html += '<div class="' + handler.baseClass + '-note"><p>' + (loadFail ? KellyTools.getLoc('retry_no_responding') : KellyTools.getLoc('option_debug')) + '</p>';
        html += '<p><button class="' + handler.baseClass + '-retry">' + KellyTools.getLoc('retry') + '</button> | <button class="' + handler.baseClass + '-download-log">' + KellyTools.getLoc('download_log') + '</button></p>';
        
        if (loadFail) html += '<p>' + KellyTools.getLoc('retry_feedback') + '</p></div>';
        
        KellyTools.setHTMLData(el, html);
        
        el.getElementsByClassName(handler.baseClass + '-retry')[0].onclick = function() { handler.updatePageStateDelayed(0, true); return false;}
        el.getElementsByClassName(handler.baseClass + '-download-log')[0].onclick = function() {
            return KellyTools.downloadTextFile('report_' + (lastVideoId ? lastVideoId : 'noId'), 'Bug report : ' + navigator.userAgent + "\n\r" + KellyTools.logBuffer);
        }            
    }
    
    function showTip(e, stick) { 
           
           var displayDataSourceCount = function(name, l, d) {
                var noticePercent = '';
                if (handler.cfg.showPercentEnabled && (l > 0 || d > 0)) noticePercent = ' (' + (l / ((l + d) / 100)).toFixed(2) + '%)';
                if (name) return '<div class="' + handler.baseClass + '-count"><div>' + name + '</div><div>' + KellyTools.dFormat(l) + ' / ' + KellyTools.dFormat(d) + noticePercent + '</div></div>';  
                else return '<div class="' + handler.baseClass + '-count">' + KellyTools.dFormat(l) + ' / ' + KellyTools.dFormat(d) + noticePercent + '</div>';  
           }
           var notice = '', ydata = lastVideoYData, noticeHelper = '', loadFail = false, logData = browsingLog[lastVideoId];           
           if (ydata) {
              
               if (!ydata.likesDisabled) {
                   
                    for (var helperApiId in logData.helperYdata) {
                        noticeHelper += displayDataSourceCount(KellyStorage.apis[helperApiId].name, logData.helperYdata[helperApiId].likes, logData.helperYdata[helperApiId].dislikes);
                    }
                    
                    if (noticeHelper && handler.cfg.showSourceEnabled) {
                        notice = displayDataSourceCount(KellyStorage.apis[ydata.apiId].name, logData.origYData.likes, logData.origYData.dislikes) + noticeHelper;
                    } else {                        
                        notice = displayDataSourceCount(false, logData.origYData.likes, logData.origYData.dislikes);
                    }
                   
               } else notice = '<div class="' + handler.baseClass + '-note"><b>Channel author disable Likes \\ Dislikes for this video</b></div>';
               
               if (handler.cfg.showSourceEnabled) {
                   
                   var noticeDate = '';
                   if (ydata.lastUpdate) {
                       var lastUpdateDate = new Date(ydata.lastUpdate);
                       if (!isNaN(lastUpdateDate.getTime())) noticeDate = ' [last upd. <b>' + lastUpdateDate.toLocaleDateString() + ' ' + KellyTools.getTime(lastUpdateDate) + '</b>]';
                   }
                   
                   notice += '<div class="' + handler.baseClass + '-extended-info">';  
                   if (ydata.disabledReasonPopup) notice += '<div class="' + handler.baseClass + '-api-disabled">' + ydata.disabledReasonPopup + '</div>';
                   notice += '<div class="' + handler.baseClass + '-api-datasource">Main source ' + noticeDate + '</div>';
                   notice += '<div class="' + handler.baseClass + '-api-copyright">' + KellyStorage.apis[ydata.apiId].name + '</div>';
                   
                   if (KellyStorage.apis[ydata.apiId].link) {
                       notice += '<div class="' + handler.baseClass + '-api-copyright-url">\
                                        <a href="' + KellyStorage.apis[ydata.apiId].link + '" target="_blank">' + KellyStorage.apis[ydata.apiId].link + '</a>\
                                  </div>';
                   }
                   
                   notice += "</div>";
               }
               
           } else {
               if (!handler.ytRequest && handler.requestsCfg.loops > handler.requestsCfg.loopsMax) loadFail = true;
               else notice = '<div class="' + handler.baseClass + '-note">' + KellyTools.getLoc('loading') + '...</div>';
           }
           
           if (loadFail || KellyTools.DEBUG) showRetryForm(handler.tooltip.getContent(), notice, loadFail); 
           else handler.getTooltip().setMessage(notice);
           
           var tooltipCfg = {
                target : handler.ratioBar, 
                offset : {left : 0, top : 0}, 
                avoidOffset : {outBottom : -22, outLeft : 0}, 
                positionY : 'bottom',
                positionX : 'left',                
                ptypeX : 'inside',
                ptypeY : 'outside',
                avoidOutOfBounds : handler.cfg.popupAvoidBoundsEnabled ? true : false,
                closeButton : false, 
           };
           
           if (isShorts()) {
               
               tooltipCfg.positionX = 'right';
               tooltipCfg.positionY = 'top';
               tooltipCfg.avoidOffset.outBottom = 22;
           }
           
           handler.getTooltip().updateCfg(tooltipCfg);
           
           if (stick) {
               handler.getTooltip().beasy = true;
               handler.getTooltip().updateCfg({closeButton : true});
           }
           
           if (isMobile()) handler.getTooltip().updateCfg({avoidOutOfBounds : false, closeButton : false, offset : {left : 16, top : 12}});
           handler.getTooltip().show(true);
     }
        
    function resetNavigation() {
        if (handler.ytRequest) handler.ytRequest.abort();
        
        if (updateTimer !== false) clearTimeout(updateTimer);
        if (initTimer !== false) clearTimeout(initTimer);
        
        lastVideoId = false;
        initTimer = false;
        updateTimer = false;
        KellyTools.logBuffer = '';
        handler.ytRequest = false;
        
        if (handler.getTooltip().isShown()) handler.getTooltip().show(false);
        if (handler.dislikeBtn) handler.dislikeBtn.style.opacity = 0.2;
    }
    
    this.getNavigation = function() {
        return {videoId : lastVideoId, browsingLog : browsingLog, browsingLogCurrent : (lastVideoId ? browsingLog[lastVideoId] : false)};
    }
        
    this.getTooltip = function() {

        if (!handler.tooltip) {
            KellyTooltip.autoloadCss = handler.baseClass + '-tool-group';
            handler.tooltip = new KellyTooltip({
                closeByBody : true,
                classGroup : handler.baseClass + '-tool-group',
                selfClass : handler.baseClass + '-tool',
                events : {                 
                    onMouseOut : function(self, e) { if (!self.beasy && !self.isChild(e.toElement || e.relatedTarget)) self.show(false); },                    
                    onClose : function(self) { self.beasy = false;},                
                }, 
                
            });
            
            if (isDarkTheme()) handler.tooltip.getContentContainer().classList.add(handler.baseClass + '-dark');
            if (handler.cfg.showSourceEnabled) handler.tooltip.getContentContainer().classList.add(handler.baseClass + '-extended');
        } 
        
        return handler.tooltip;
    }
    
    this.log = function(err, notice) {        
        KellyTools.log(err, 'kellyShowRate', notice ? KellyTools.E_NOTICE : KellyTools.E_ERROR);
    }
    
    function updatePageState(nextLoop) {
        
        if (handler.requestsCfg.enabledApis.length <= 0) {
            handler.log('[updatePageState] All requests APIs disabled', true);
            return;
        }
        
        if (!nextLoop) {
            handler.currentApi = false;
            handler.requestsCfg.loops = 1;
        } else handler.requestsCfg.loops++;
        
        if (!handler.currentApi) handler.currentApi = handler.requestsCfg.enabledApis[0];
        else handler.currentApi = handler.requestsCfg.enabledApis[handler.requestsCfg.enabledApis.indexOf(handler.currentApi) + 1];
        
        if (!handler.currentApi) handler.currentApi = handler.requestsCfg.enabledApis[0];
        // if (['youtubeMetric', 'catface', 'ryda'].indexOf(handler.currentApi) != -1) 
        updatePageStateByAR(nextLoop);
    }
    
    this.updatePageStateDelayed = function(d, clearCache) {
        
        if (updateTimer !== false) clearTimeout(updateTimer);
        updateTimer = setTimeout(function() {
            
            if (clearCache && lastVideoId && browsingLog[lastVideoId]) {
                browsingLog[lastVideoId] = handler.getDefaultBrowsingLog();     
            }
            
            resetNavigation();
            updateTimer = false;
            
            updatePageState();
            
            setTimeout(updateRatioWidth, 200);
            
        }, d ? d : 300);
    }
    
    this.updatePageStateWaitDomReady = function() {
                
        initCss(); resetNavigation();
        if (!getVideoId()) {
            
            handler.log('[getPageDom] Video page not found. Wait next navigation', true);
            handler.buttonsWraper = false;
            handler.dislikeBtn = false;
            
            return false;
        }
        
        if (!getPageDom()) {
            handler.log('[updatePageStateWaitDomReady] Wait dom ready...', true);
            initTimer = setTimeout(handler.updatePageStateWaitDomReady, 150);
            return;
        }
        
        setTimeout(updateRatioWidth, 200);
        handler.log('[updatePageStateWaitDomReady] Init extension dom and env', true);
        if (KellyStorage.bgFail) KellyTools.setHTMLData(handler.dislikeBtn, handler.bgFailTpl);
        else updatePageState();
    }
        
    this.init = function() {
        
        KellyStorage.load(function(cfg) {
            
            handler.cfg = cfg;
            handler.requestsCfg.enabledApis = [];
            handler.requestsCfg.helperApis = [];
            initSelectors();
            
            for (var i = 0; i < handler.cfg.apis.order.length; i++) {
                var apiId = handler.cfg.apis.order[i];
                if (handler.cfg.apis.cfg[apiId].enabled) handler.requestsCfg.enabledApis.push(apiId);
                if ( KellyStorage.apis[apiId].helperMode && handler.cfg.apis.cfg[apiId].enabledAsHelper) handler.requestsCfg.helperApis.push(apiId);
            }
            
            if (handler.requestsCfg.loopsMax == -1) handler.requestsCfg.loopsMax = handler.requestsCfg.enabledApis.length * 3;
                      
            initCss();
            handler.log(isMobile() ? '[Mobile]' : '[Desktop] version controller Drivers : [' + handler.requestsCfg.enabledApis.length + '] [loopsMax ' + handler.requestsCfg.loopsMax + ']', true);
            if (KellyStorage.bgFail) handler.log('[Background process dead]', true);
            
            if (isMobile()) {
                
                var mobileMutationDelayRedraw = function() {
                    if (getPageDom() && lastVideoYData) showYData(lastVideoYData, 'mobileMutationDelayRedraw.redraw');
                }
                
                handler.observer = new MutationObserver(function(mutations) {
                    
                    var redraw = false;
                    for (var i = 0; i < mutations.length; i++) {
                        
                        if (mutations[i].type == 'childList' && 
                            (mutations[i].target.classList.contains('slim-video-action-bar-actions')) &&
                            mutations[i].addedNodes.length > 0 && 
                            mutations[i].addedNodes[0].nodeType == Node.ELEMENT_NODE && 
                            mutations[i].addedNodes[0].classList.contains('button-renderer')) {
                                
                            return handler.updatePageStateDelayed(200);
                            
                        } else if (lastVideoYData && handler.buttonsWraper) {
                            
                            if (handler.getTooltip().isChild(mutations[i].target, handler.buttonsWraper) ||
                                typeof mutations[i].target.className != 'string' || 
                                (mutations[i].target.nodeType == Node.ELEMENT_NODE &&
                                typeof mutations[i].target.className == 'string' && mutations[i].target.className.indexOf('ytp') == -1)) {
                                continue;
                            } 
                            
                            redraw = true;
                        }
                    }

                    if (redraw){
                        if (handler.mobileMutationsTimer) clearTimeout(handler.mobileMutationsTimer);
                            handler.mobileMutationsTimer = setTimeout(mobileMutationDelayRedraw, 300);
                    }               
                });
                
                document.addEventListener('click', function() {setTimeout(mobileMutationDelayRedraw, 300);});
                window.addEventListener('scroll', function() { handler.getTooltip().show(false); });
                handler.observer.observe(document.body, {childList: true, attributes: true, subtree: true});
                handler.updatePageStateDelayed(0);
                
            } else { 
                document.addEventListener('yt-navigate-finish', handler.updatePageStateWaitDomReady);
                handler.updatePageStateWaitDomReady();                
            }
                                
            document.addEventListener('click', function (e) {
                
                if (!handler.buttonsWraper) return;
                
                if (handler.getTooltip().isChild(e.target, handler.buttonsWraper.children[0]) || 
                    handler.getTooltip().isChild(e.target, handler.buttonsWraper.children[1])) {
                    
                    if (lastVideoId && browsingLog[lastVideoId]) actionRequest(getRatingState(), 'button_click');
                    
                    // drop cache if needed to resend request browsingLog[lastVideoId] = false;
                    
                    handler.updatePageStateWaitDomReady();
                }
            });
        });
        
    }    
};

KellyShowRate.apiController = {};
KellyShowRate.getInstance = function() {
    if (typeof KellyShowRate.instance == 'undefined') KellyShowRate.instance = new KellyShowRate();
    return KellyShowRate.instance;
}