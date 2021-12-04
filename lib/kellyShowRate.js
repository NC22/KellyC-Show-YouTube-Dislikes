/* 
    @encoding       utf-8
    @name           kellyShowRate
    @namespace      Kelly
    @description    Show dislikes
    @author         Rubchuk Vladimir <torrenttvi@gmail.com>
    @license        GPLv3

*/

function KellyShowRate(cfg) {

    var lastVideoId = false;
    var lastVideoYData = false;
    
    var browsingLog = {};
    
    var updateTimer = false;
    var initTimer = false;
        
    var handler = this;
    
        handler.cfg = false;
        handler.attempt = 0;
        handler.baseClass = 'kelly-show-rating';

        handler.ratioBar = false;
        handler.ratioBarTpl = '<div class="' + handler.baseClass + '-ratio-like"></div><div class="' + handler.baseClass + '-ratio-dislike"></div>';
        
        handler.dislikeBtn = false;
        handler.likeBtn = false;
        handler.ytRequest = false;
        
        handler.requestsCfg = {
            
            enabledApis : [],
            
            loops : 1,
            loopsMax : -1, // max change driver attempts -1 = drivers.length * 3
        }
        
    this.getDefaultBGRequest = function() {
        return { method: "getYoutubeInfo" };
    }
    
    function isDarkTheme() {
        return document.documentElement.getAttribute('dark') == 'true';
    }
    
    function isMobile() {
        return window.location.href.indexOf('m.youtube') != -1;
    }
    
    function getVideoId(href) {          
    
        href = href ? href : window.location.href;
        if (!href) return false;
        
        href = href.replace('app=desktop&', '');
        var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
        var match = href.match(regExp);
        
        return (match && match[7].length==11) ? match[7] : false;
    }
    
    function getUserId() { 
    
        var scripts = document.getElementsByTagName('SCRIPT');

        for (var i = 0; i < scripts.length; i++) {
            if (scripts[i].innerHTML.indexOf('browseId') != -1) {
                
                // mobile version encodes script containers in some way
                var encoded = scripts[i].innerHTML.indexOf('\\x5b\\x7b\\x22') != -1;
                var pageDataRegExpEncoded = /\\x22browseId\\x22\:\\x22([A-Za-z0-9]+)\\x22?/;
                
                var pageDataRegExp = /\"browseId\"\:\"([A-Za-z0-9]+)\"?/;
                var pageData = encoded ? pageDataRegExpEncoded.exec(scripts[i].innerHTML) : pageDataRegExp.exec(scripts[i].innerHTML);
                
                if (pageData) return pageData[1];
                else return false;
            } 
        }
        
        return false;
    } 
    
    function getRatingState() {
        if (!handler.buttonsWraper) return 'unkonwn';
        
             if (handler.buttonsWraper.children[0].querySelector('button[aria-pressed=true]')) return 'liked';
        else if (handler.buttonsWraper.children[1].querySelector('button[aria-pressed=true]')) return 'disliked';
        else return 'neutral';
    } 
        
    function getPageDom() {    
        
        if (isMobile()) {
            
            handler.buttonsWraper = document.querySelector('.slim-video-action-bar-actions');
            if (handler.buttonsWraper) {
                handler.likeBtn = handler.buttonsWraper.children[0].querySelector('.button-renderer-text');
                handler.dislikeBtn = handler.buttonsWraper.children[1].querySelector('.button-renderer-text');
            }
            
        } else {
            
            var menu = document.getElementById("menu-container");
            if (menu) {
                handler.buttonsWraper = menu.querySelector("#top-level-buttons-computed");
                if (handler.buttonsWraper) {
                    handler.dislikeBtn = handler.buttonsWraper.children[1].querySelector('#text');  
                    handler.likeBtn = handler.buttonsWraper.children[0].querySelector('#text');
                }
            }
        }
        
        // youtube renderer redraw likes counter in some cases even if navigation already finished
        if (handler.buttonsWraper && !handler.protectCounters) {
            handler.protectCounters = new MutationObserver(function(mutations) {
                
                for (var i = 0; i < mutations.length; i++) {
                                              
                    if (mutations[i].type == 'childList' &&
                       ((KellyStorage.apis[handler.currentApi].updateLikes && mutations[i].target == handler.likeBtn) || mutations[i].target == handler.dislikeBtn) && 
                        mutations[i].addedNodes.length > 0 && 
                        mutations[i].addedNodes[0].nodeType == Node.TEXT_NODE) {                                
                        mutations[i].addedNodes[0].textContent = '';
                    }  
                }
            });
            
            handler.protectCounters.observe(handler.buttonsWraper, {childList: true, subtree: true});
        }
        
        return handler.dislikeBtn;
    }   
        
    function updateRatioWidth() {
        
        if (handler.ratioBar && handler.buttonsWraper && handler.buttonsWraper.children.length > 1) {
            var boundsData = handler.buttonsWraper.children[1].getBoundingClientRect();
            var paddingEl = handler.buttonsWraper.children[1].querySelector('A');
            var totalPadding = 8;
            if (paddingEl) totalPadding += parseInt(window.getComputedStyle(paddingEl).paddingRight);
            
            // console.log(totalPadding);
            handler.ratioBarMaxWidth = (boundsData.left + boundsData.width) - totalPadding - handler.buttonsWraper.children[0].getBoundingClientRect().left;
            
            if (handler.ratioBarMaxWidth < 60) handler.ratioBarMaxWidth = 150;
            if (handler.ratioBarMaxWidth > 210) handler.ratioBarMaxWidth = 210;
            
            handler.ratioBar.style.width = handler.ratioBarMaxWidth + 'px';
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
        
        handler.ratioBar.className = barCl + ' ' + (isMobile() ? barCl + '-mobile ' : '') + (ydata ? '' : barCl + '-load ') + barCl + (ydata && ydata.apiId ? barCl + '-' + ydata.apiId : '');

        if (ydata) {
            var percent = (ydata.likes + ydata.dislikes) / 100, api = handler.cfg.apis.cfg[ydata.apiId];
            if (ydata.likes > 0 || ydata.dislikes > 0) {
                likeEl.style.width = (ydata.likes / percent).toFixed(2) + '%';        
                dlikeEl.style.width = (ydata.dislikes / percent).toFixed(2) + '%';
            }
            
            if (api.ratioLikeColor) likeEl.style.backgroundColor = api.ratioLikeColor;
            if (api.ratioDislikeColor) dlikeEl.style.backgroundColor = api.ratioDislikeColor;
        }
        
        updateRatioWidth();
        handler.buttonsWraper.children[0].appendChild(handler.ratioBar); 
        var showTip = function (e, stick) { 
            
           var notice = '';
           
           if (ydata) notice = '<div class="' + handler.baseClass + '-count">' + KellyTools.dFormat(ydata.likes) + ' / ' + KellyTools.dFormat(ydata.dislikes) + '</div>';
           else notice = '<div class="' + handler.baseClass + '-note">Loading</div>';
           
           if (ydata.likesDisabled) notice = '<div class="' + handler.baseClass + '-note"><b>Channel author disable Likes \\ Dislikes for this video</b></div>';
           if (ydata && handler.cfg.showSourceEnabled) {
               
               notice += '<div class="' + handler.baseClass + '-extended-info">';
               
               notice += '<div class="' + handler.baseClass + '-api-datasource">Data source : </div>';
               notice += '<div class="' + handler.baseClass + '-api-copyright">' + KellyStorage.apis[ydata.apiId].name + '</div>';
               
               if (KellyStorage.apis[ydata.apiId].link) {
                   notice += '<div class="' + handler.baseClass + '-api-copyright-url">\
                                    <a href="' + KellyStorage.apis[ydata.apiId].link + '" target="_blank">' + KellyStorage.apis[ydata.apiId].link + '</a>\
                              </div>';
               }
               
               notice += "</div>";
           }
           
           handler.getTooltip().setMessage(notice);
           
           handler.getTooltip().updateCfg({
                target : handler.ratioBar, 
                offset : {left : 0, top : -2}, 
                positionY : 'bottom',
                positionX : 'left',                
                ptypeX : 'inside',
                ptypeY : 'outside',
                avoidOutOfBounds : false,
                closeButton : false, 
           });
           
           if (stick) {
               handler.getTooltip().beasy = true;
               handler.getTooltip().updateCfg({closeButton : true});
               if (isMobile()) handler.getTooltip().updateCfg({offset : {left : 30, top : 12}});
           }
           
           handler.getTooltip().show(true);
        }
        
        handler.ratioBar.onmouseover = function(e){
            if (handler.getTooltip().beasy) return;
            showTip(e);
        }
        
        handler.ratioBar.onclick = function(e){
            
            if (handler.cfg.showSourceEnabled) showTip(e, true);            
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
        
        if (!browsingLog[videoId]) browsingLog[videoId] = {actionState : getRatingState(), ydata : false};
        
        if (handler.ytRequest) handler.ytRequest.abort();
        
        // check history data before request - clean history if needed before request
        
        if (browsingLog[videoId].ydata && showYData(browsingLog[videoId].ydata, 'redraw.existData')) {
            return onReady(false, 'data already loaded before : ' + lastVideoId);
        }
        
        var apiCfg = KellyStorage.apis[handler.currentApi];
        
        var requestCfg = {
            
            apiId : handler.currentApi,
            context : 'prepareRequestStart',
            videoId : videoId, 
            url : KellyStorage.apis[handler.currentApi].api.replace('__VIDEOID__', videoId),
            maxAttempts : apiCfg.maxAttempts ? apiCfg.maxAttempts : 3,
            nextDriverTimeout : typeof apiCfg.nextDriverTimeout != 'undefined' ? apiCfg.nextDriverTimeout : 500,            
            timeout : apiCfg.rTimeout ? apiCfg.rTimeout : handler.cfg.rTimeout,
            fetchParams : apiCfg.fetchParams ? apiCfg.fetchParams : false, // default GET request without coockies
        };
        
        if (!KellyShowRate.apiController[handler.currentApi].onPrepareGetRatingRequestStart ||
            KellyShowRate.apiController[handler.currentApi].onPrepareGetRatingRequestStart(handler, requestCfg, onReady) !== true) {
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
                
                handler.log('[updatePageStateByAR][Skip request] ' + notice, true);
                return;
            }
            
            handler.log('[updatePageStateByAR] update [' + attempt + '/' + requestCfg.maxAttempts + '] [loop : ' + handler.requestsCfg.loops + ']', true)
            
            handler.ytRequest = getYTData(requestCfg, function(ydata, error) {
                
                getPageDom();     
                handler.ytRequest = false;
                if (!error) {
                    browsingLog[requestCfg.videoId].ydata = ydata;
                    
                    handler.log('[' + handler.currentApi + '] result data : ', true);
                    handler.log(ydata, true);
                    
                    if (!showYData(browsingLog[requestCfg.videoId].ydata, 'getYTData.newData')) {
                        error = 'dataParserError'; // parser deprecated ? - imidiatly go to api methods
                        attempt = requestCfg.maxAttempts;
                        handler.log('[updatePageStateByAR] parser deprecated or data not available | next in ms' + requestCfg.nextDriverTimeout, true);
                    }
                } 

                if (error) {
                    
                    if (attempt + 1 <= requestCfg.maxAttempts) {
                    
                        handler.log('[updatePageStateByAR][FAIL] ' + error, true);
                        updatePageStateByAR(true, attempt + 1);
                        
                    } else setTimeout(function() { updatePageState(true); }, requestCfg.nextDriverTimeout);     
                }         
            });
        });
        
    }
    
    /*
        sync action data with available APIs        
    */    
    
    function prepareActionRequestStart(apiId, type, undo, initiator, onReady) {
                  
         handler.log('[actionRequest][' + apiId + '] : prepare request ' + type + ' | ' + (undo ? 'UNDO' : ''), true);        
        
         if (!KellyStorage.apis[apiId].sync) {
             onReady(false, 'Sync data not supported by API ' + apiId);
             return;
         }
         
         var requestContext = {videoId : lastVideoId, uuid : getUserId(), type : type, undo : undo, apiId : apiId, initiator : initiator};
         
         if (!requestContext.uuid || !requestContext.videoId || requestContext.type == 'neutral' || !browsingLog[requestContext.videoId]) {
             onReady(false, 'Not enough input data for [Vote] action : ' + JSON.stringify(requestContext));
             return;
         }
         
         if (KellyShowRate.apiController[apiId].onPrepareActionRequestStart(handler, requestContext, onReady) !== true) {
            onReady(false, 'prepareActionRequestStart not implemented for API ' + apiId); // sync mode
         }
    }
    
    // checks if API support actions and if user allow send his actions to API
    
    this.actionRequestInitForApi = function(apiId, type, undo, initiator, onReady) {
        
        if (!KellyStorage.apis[apiId].sync || !handler.cfg.apis.cfg[apiId].syncData) return false;
        
        prepareActionRequestStart(apiId, type, undo, initiator, function(requestBgCfg, error) {
            
            if (!requestBgCfg) return handler.log('[actionRequest] Fail to create request config : ' + error, true);
                            
            KellyTools.getBrowser().runtime.sendMessage(requestBgCfg, function(response) {
                    
                  // currently no any postprocessing needed, just log errors
                  
                  if (KellyShowRate.apiController[apiId].onGetActionDataReady && 
                      KellyShowRate.apiController[apiId].onGetActionDataReady(handler, response, requestBgCfg.requestCfg, onReady) !== false) {
                      if (onReady) onReady(response);
                  }  
                  
                  if (initiator == 'button_click' && KellyShowRate.apiController[handler.currentApi].updateOnActionClick) handler.updatePageStateDelayed(300, true);
                  
                  if (response.error) handler.log('[actionRequest] Request error : ' + response.error, true);  
                  else handler.log('[actionRequest] Action accepted | [' + type + '] [' + (undo ? 'UNDO' : 'SET') + ']', true);
            }); 
          
        });
    }
    
    function actionRequest(type, initiator) {
        
        if (!type || type == 'unkonwn') return false;
        
        if (!lastVideoId || !browsingLog[lastVideoId]) return false;
        
        handler.log('[actionRequest] : Update rating action state from [' + browsingLog[lastVideoId].actionState + '] to [' + type + ']', true);
        
        var oldAction = ['liked', 'disliked'].indexOf(browsingLog[lastVideoId].actionState) != -1 && type != browsingLog[lastVideoId].actionState ? browsingLog[lastVideoId].actionState : false;
        var undo = false;
        
        if (type == 'neutral') {
            type = browsingLog[lastVideoId].actionState; 
            undo = true;
            browsingLog[lastVideoId].actionState = 'neutral';
        } else {
            browsingLog[lastVideoId].actionState = type;
        }
                
        for (var apiId in KellyStorage.apis) {
            if (oldAction) handler.actionRequestInitForApi(apiId, oldAction, true, initiator + '_old_action');
            handler.actionRequestInitForApi(apiId, type, undo, initiator);
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
               }
           }
           
       } else {
           handler.log('empty YData', true);
           ydata = false;
       }
       
       return ydata;
    }
    
    function updateCounter(type, counterEl, val) {
        
        if (document.getElementById('redux-style') || !counterEl) return;
        var holder = document.getElementsByClassName(handler.baseClass + '-' + type);
        if (holder.length <= 0) {
            holder = document.createElement('span');
            holder.className = handler.baseClass + '-' + type;
        } else holder = holder[0];
                
        if (val === false) {
            holder.innerHTML = ''; 
        } else {
            counterEl.innerHTML = '';
            counterEl.appendChild(holder); 
            KellyTools.setHTMLData(holder, val === 'disabled' ? 'Votes disabled' : KellyTools.nFormat(val));
        }
    }
    
    function showYData(ydata, callerId) {
        
        handler.log('[showYData] show YData [' + callerId + ']', true);
        
        lastVideoYData = validateYData(ydata);  
        var ratingState = getRatingState();
        getPageDom();
        
        /*
             todo 
             
             add like \ dislike from actions - browsingLog[lastVideoId]
            
        */
        
        if (lastVideoYData) {
                        
            handler.dislikeBtn.style.opacity = 1;
            
           // if (lastVideoYData.dislikes === 0 && ratingState == 'disliked') lastVideoYData.dislikes = 1;
           // if (lastVideoYData.likes === 0 && ratingState == 'liked') lastVideoYData.likes = 1;
            
            var api = KellyStorage.apis[lastVideoYData.apiId];
            var showZero = api && api.showZero, updateLikes = api && api.updateLikes;
            
            if (lastVideoYData.likesDisabled) {
                
                updateCounter('like', handler.likeBtn, updateLikes ? 'disabled' : false);                
                updateCounter('dislike', handler.dislikeBtn, 'disabled');
                updateRatio();
                
            } else if (lastVideoYData.dislikes === 0 && lastVideoYData.likes === 0 && !showZero) { // statistic disabled \ zero - cleanup counters as possible
                
                // disabled likes \ dislikes bar
                if (handler.ratioBar) handler.ratioBar.parentNode.removeChild(handler.ratioBar);  

                updateCounter('dislike', handler.dislikeBtn, false);
                if (updateLikes) updateCounter('like', handler.likeBtn, false);
                
                handler.ratioBar = false;
                
            } else {
                
                updateCounter('like', handler.likeBtn, updateLikes ? lastVideoYData.likes : false);                
                updateCounter('dislike', handler.dislikeBtn, lastVideoYData.dislikes);
                
                // KellyTools.setHTMLData(handler.dislikeBtn, nFormat(lastVideoYData.dislikes));
                // if (updateLikes && handler.likeBtn) KellyTools.setHTMLData(handler.likeBtn, nFormat(lastVideoYData.likes));
                
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
    
    function resetNavigation() {
        if (handler.ytRequest) handler.ytRequest.abort();
        
        if (updateTimer !== false) clearTimeout(updateTimer);
        if (initTimer !== false) clearTimeout(initTimer);
        
        lastVideoId = false;
        initTimer = false;
        updateTimer = false;
        
        handler.ytRequest = false;
        
        if (handler.getTooltip().isShown()) handler.getTooltip().show(false);
        if (handler.dislikeBtn) handler.dislikeBtn.style.opacity = 0.2;
    }
    
    this.getNavigation = function() {
        return {videoId : lastVideoId, browsingLog : browsingLog};
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
        
        if (clearCache && lastVideoId && browsingLog[lastVideoId]) browsingLog[lastVideoId].ydata = false;        
        resetNavigation();
        
        if (updateTimer !== false) clearTimeout(updateTimer);
        
        updateTimer = setTimeout(function() {
            updateTimer = false;
            updatePageState();
            setTimeout(updateRatioWidth, 200);
        }, d ? d : 300);
    }
    
    this.updatePageStateWaitDomReady = function() {
                
        initCss(); resetNavigation();
        if (window.location.href.indexOf('watch?') == -1) {
            
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
        updatePageState();
    }
        
    this.init = function() {
        
        KellyStorage.load(function(cfg) {
            
            handler.cfg = cfg;  
            
            handler.requestsCfg.enabledApis = [];
            
            for (var i = 0; i < handler.cfg.apis.order.length; i++) {
                var apiId = handler.cfg.apis.order[i];
                if (handler.cfg.apis.cfg[apiId].enabled) handler.requestsCfg.enabledApis.push(apiId);
            }
            
            handler.requestsCfg.loopsMax = handler.requestsCfg.enabledApis.length * 3;
                        
            initCss();
            handler.log(isMobile() ? '[Mobile]' : '[Desktop] version controller Drivers : [' + handler.requestsCfg.enabledApis.length + '] [loopsMax ' + handler.requestsCfg.loopsMax + ']', true);
            
            if (isMobile()) {
                
                var mobileMutationDelayRedraw = function() {
            
                    getPageDom(); 
                    if (lastVideoYData) showYData(lastVideoYData, 'mobileMutationDelayRedraw.redraw');
                }
                
                handler.observer = new MutationObserver(function(mutations) {
                    
                    var redraw = false;
                    for (var i = 0; i < mutations.length; i++) {
                                                  
                        if (mutations[i].type == 'childList' &&  mutations[i].target.classList.contains('slim-video-action-bar-actions') &&
                            mutations[i].addedNodes.length > 0 && 
                            mutations[i].addedNodes[0].nodeType == Node.ELEMENT_NODE && 
                            mutations[i].addedNodes[0].classList.contains('button-renderer')) {
                                
                            handler.updatePageStateDelayed(200);
                            return;
                            
                        } else if (lastVideoYData && handler.buttonsWraper) {
                            
                            if (handler.getTooltip().isChild(mutations[i].target, handler.buttonsWraper) ||
                                typeof mutations[i].target.className != 'string' || 
                                (mutations[i].target.nodeType == Node.ELEMENT_NODE &&
                                typeof mutations[i].target.className == 'string' && mutations[i].target.className.indexOf('ytp') == -1)) {

                                continue;
                            } 
                            
                            redraw = true;
                            if (handler.mobileMutationsTimer) clearTimeout(handler.mobileMutationsTimer);
                            handler.mobileMutationsTimer = setTimeout(mobileMutationDelayRedraw, 300);
                            
                        }
                        
                        // console.log(mutations[i]);
                    }

                    if (redraw) mobileMutationDelayRedraw();                    
                });
                
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