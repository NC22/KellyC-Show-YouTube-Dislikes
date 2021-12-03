/* 
    @encoding       utf-8
    @name           kellyShowRate
    @namespace      Kelly
    @description    Show dislikes
    @author         Rubchuk Vladimir <torrenttvi@gmail.com>
    @license        GPLv3

    ToDo : 
        
        - move implementation of APIs to separate libs with 
        event listeners for prepareActionRequestStart | prepareRequestStart | getYData methods
    
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
        handler.dislikeBtn = false;
        handler.likeBtn = false;
        handler.ytRequest = false;
        
        handler.requestsCfg = {
            
            enabledApis : [],
            
            loops : 1,
            loopsMax : 4,
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
    
    function getRatingState() {
        if (!handler.buttonsWraper) return 'unkonwn';
        
             if (handler.buttonsWraper.children[0].querySelector('button[aria-pressed=true]')) return 'liked';
        else if (handler.buttonsWraper.children[1].querySelector('button[aria-pressed=true]')) return 'disliked';
        else return 'neutral';
    }
    
    function getUserId() { 
    
        var scripts = document.getElementsByTagName('SCRIPT');

        for (var i = 0; i < scripts.length; i++) {
                if (scripts[i].innerHTML.indexOf('browseId') != -1) {
                var pageDataRegExp = /\"browseId\"\:\"([A-Za-z0-9]+)\"?/;
                var pageData = pageDataRegExp.exec(scripts[i].innerHTML);
                 
                    return pageData ? pageData[1] : false;
                } 
        }
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
        
        return handler.dislikeBtn;
    }    
    
    function nFormat(num) {
        
        if(num > 999 && num < 1000000) {
            
            return (num / 1000).toFixed(1) + "&nbsp;" + KellyTools.getLoc('num_k'); 
            
        } else if(num > 1000000) {
            
            return (num / 1000000).toFixed(1) + "&nbsp;" + KellyTools.getLoc('num_m');
            
        } else {
            
            return num.toString(); 
        }
    }
    
    function dFormat(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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
        
    function updateRatio(ydata) {
        
        if (!handler.cfg.showRatioEnabled) return;
        if (!handler.buttonsWraper) return;
        
        handler.ratioBar = document.getElementsByClassName(handler.baseClass + '-ratio-bar');
        var likeEl = false, dlikeEl = false, percent = (ydata.likes + ydata.dislikes) / 100;
        
        if (handler.ratioBar.length <= 0) {
            likeEl = document.createElement('DIV');
            likeEl.className = handler.baseClass + '-ratio-like';
            
            dlikeEl = document.createElement('DIV');
            dlikeEl.className = handler.baseClass + '-ratio-dislike';
            
            handler.ratioBar = document.createElement('DIV');
            handler.ratioBar.className = handler.baseClass + '-ratio-bar';
            handler.ratioBar.appendChild(likeEl);
            handler.ratioBar.appendChild(dlikeEl);
            
        } else {
            handler.ratioBar = handler.ratioBar[0];
            likeEl = handler.ratioBar.getElementsByClassName(handler.baseClass + '-ratio-like')[0];
            dlikeEl = handler.ratioBar.getElementsByClassName(handler.baseClass + '-ratio-dislike')[0];
        }
        
        handler.ratioBar.className = handler.baseClass + '-ratio-bar';
        if (isMobile()) handler.ratioBar.classList.add(handler.baseClass + '-ratio-bar-mobile');
        if (ydata.apiId) handler.ratioBar.classList.add(handler.baseClass + '-' + ydata.apiId + '-bar');
        
        handler.ratioBar.classList.remove(handler.baseClass + '-ratio-bar-load');
        updateRatioWidth();

        if (ydata.likes === 0 && ydata.dislikes === 0) {
            likeEl.style.width = '50%';
            dlikeEl.style.width = '50%';
            
        } else {
            likeEl.style.width = (ydata.likes / percent).toFixed(2) + '%';        
            dlikeEl.style.width = (ydata.dislikes / percent).toFixed(2) + '%';
        }

        handler.buttonsWraper.children[0].appendChild(handler.ratioBar);
        
        var showTip = function (e, stick) { 
            
           var additionNotice = '';
           
           if (handler.cfg.showSourceEnabled) {
               
               additionNotice += '<div class="' + handler.baseClass + '-extended-info">';
               
               additionNotice += '<div class="' + handler.baseClass + '-api-datasource">Data source : </div>';
               additionNotice += '<div class="' + handler.baseClass + '-api-copyright">' + KellyStorage.apis[ydata.apiId].name + '</div>';
               
               if (KellyStorage.apis[ydata.apiId].link) {
                   additionNotice += '<div class="' + handler.baseClass + '-api-copyright-url">\
                                            <a href="' + KellyStorage.apis[ydata.apiId].link + '" target="_blank">' + KellyStorage.apis[ydata.apiId].link + '</a>\
                                      </div>';
               }
               
               additionNotice += "</div>";
           }
           
           handler.getTooltip().setMessage('<div class="' + handler.baseClass + '-count">' + dFormat(ydata.likes) + ' / ' + dFormat(ydata.dislikes) + '</div>' + additionNotice);
           
           handler.getTooltip().updateCfg({
                target : handler.ratioBar, 
                offset : {left : 0, top : 12}, 
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
           }
           
           handler.getTooltip().show(true);
        }
        
        handler.ratioBar.onmouseover = function(e){
            if (handler.getTooltip().beasy) return;
            showTip(e);
        }
        
        handler.ratioBar.onclick = function(e){
            
            if (handler.cfg.showSourceEnabled) {
                showTip(e, true);
            }
            
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
                  KellyShowRate.apiController[cfg.apiId].onGetYDataReady(handler, requestBg, response, onLoad) === true) {
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
        
        if (!browsingLog[videoId]) browsingLog[videoId] = {actionState : getRatingState(), ydata : false};
        
        if (handler.ytRequest) handler.ytRequest.abort();
         
        if (handler.ratioBar) handler.ratioBar.classList.add(handler.baseClass + '-ratio-bar-load');

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
                    
                    if (!showYData(browsingLog[requestCfg.videoId].ydata, 'getYTData.newData')) error = 'dataParserError'; // parser deprecated ? - imidiatly go to api methods
                } else {
                    
                    if (error != 'dataParserError' && attempt+1 <= requestCfg.maxAttempts) {
                        
                        handler.log('[updatePageStateByAR] [FAIL] ' + error, true);
                        updatePageStateByAR(true, attempt+1);
                        
                    } else {
                        
                        handler.log('[updatePageStateByAR] parser deprecated or data not available', true);
                        
                        if (requestCfg.nextDriverTimeout) handler.dislikeBtn.innerText = '??';
                    
                        setTimeout(function() { updatePageState(true); }, requestCfg.nextDriverTimeout);
                    }
                }                    
            });
        });
        
    }
    
    /*
        sync action data with available APIs        
    */    
    
    function prepareActionRequestStart(apiId, type, undo, onReady) {
                  
         handler.log('[actionRequest][' + apiId + '] : prepare request ' + type + ' | ' + (undo ? 'UNDO' : ''), true);        
        
         if (!KellyStorage.apis[apiId].sync) {
             onReady(false, 'Sync data not supported by API ' + apiId);
             return;
         }
         
         var requestContext = {videoId : lastVideoId, uuid : getUserId(), type : type, undo : undo, apiId : apiId};
         
         if (!requestContext.uuid || !requestContext.videoId || requestContext.type == 'neutral' || !browsingLog[requestContext.videoId]) {
             onReady(false, 'BAD input data [l:' + uuid + ' |v: ' + videoId + ' |s: ' + type + ' | ' + (browsingLog[requestContext.videoId] ? 'history OK' : 'history NO'));
             return;
         }
         
         if (KellyShowRate.apiController[apiId].onPrepareActionRequestStart(handler, requestContext, onReady) !== true) {
            onReady(false, 'prepareActionRequestStart not implemented for API ' + apiId); // sync mode
         }
    }
    
    // checks if API support actions and if user allow send his actions to API
    
    function actionRequestInitForApi(apiId, type, undo) {
        
        if (!KellyStorage.apis[apiId].sync || !handler.cfg.apis.cfg[apiId].syncData) return false;
        
        prepareActionRequestStart(apiId, type, undo, function(requestCfg, error) {
            
            if (!requestCfg) {
                handler.log('[actionRequest] Fail to create request config : ' + error, true);
                return;
            }
                            
            KellyTools.getBrowser().runtime.sendMessage(requestCfg, function(response) {
                    
                  // currently no any postprocessing needed, just log errors
                  
                  if (KellyShowRate.apiController[apiId].onGetActionDataReady) {
                      KellyShowRate.apiController[apiId].onGetActionDataReady(handler, response);
                  }  
                  
                  if (response.error) handler.log('[actionRequest] Request error : ' + response.error, true);  
                  else handler.log('[actionRequest] Action accepted', true);
            }); 
          
        });
    }
    
    function actionRequest(type) {
        
        if (!type) return false;
        if (!lastVideoId || !browsingLog[lastVideoId]) return false;
        
        handler.log('[actionRequest] : Update rating action state from [' + browsingLog[lastVideoId].actionState + '] to [' + type + ']', true);
        
        var undo = false;
        
        if (type == 'neutral') {
            type = browsingLog[lastVideoId].actionState; 
            undo = true;
            browsingLog[lastVideoId].actionState = 'neutral';
        } else {
            browsingLog[lastVideoId].actionState = type;
        }
                
        for (var apiId in KellyStorage.apis) actionRequestInitForApi(apiId);
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
    
    function showYData(ydata, callerId) {
        
        handler.log('[showYData] show YData [' + callerId + ']', true);
        lastVideoYData = validateYData(ydata);  
        var ratingState = getRatingState();
        
        /*
        
             todo 
             
             add like \ dislike from actions - browsingLog[lastVideoId]
            
        */
        
        if (lastVideoYData) {
                        
            handler.dislikeBtn.style.opacity = 1;
            
            if (lastVideoYData.dislikes === 0 && ratingState == 'disliked') lastVideoYData.dislikes = 1;
            if (lastVideoYData.likes === 0 && ratingState == 'liked') lastVideoYData.likes = 1;
            
            var api = KellyStorage.apis[lastVideoYData.apiId];
            var showZero = api && api.showZero;
            
            // statistic disabled \ zero - cleanup counters as possible
            if (lastVideoYData.dislikes === 0 && lastVideoYData.likes === 0 && !showZero) {
                
                // disabled likes \ dislikes bar
                if (handler.ratioBar) handler.ratioBar.parentNode.removeChild(handler.ratioBar);  

                var num = parseInt(handler.dislikeBtn.innerText.replace(/[^0-9]/g,''));
                if (!isNaN(num)) handler.dislikeBtn.innerText = '';
                
                handler.ratioBar = false;
                
            } else {
                
                KellyTools.setHTMLData(handler.dislikeBtn, nFormat(lastVideoYData.dislikes));
                updateRatio(lastVideoYData);
                setTimeout(updateRatioWidth, 500);
            }  

            return true;
            
       } else return false;
    }
            
    function initCss() {
        if (document.getElementById(handler.baseClass + '-mainCss')) return;             
        
        handler.log('[initCss] Load resources from BG', true);
        KellyTools.getBrowser().runtime.sendMessage({
            method: "getCss", 
        }, function(response) {
            
            response.css = KellyTools.replaceAll(response.css, '__BASECLASS__', handler.baseClass);
            var head = document.head || document.getElementsByTagName('head')[0];
            var style = document.createElement('style');
                style.type = 'text/css';
                style.id = handler.baseClass + '-mainCss';       
                head.appendChild(style);
            
            var baseClassLike = ' .' + handler.baseClass + '-ratio-bar .' + handler.baseClass + '-ratio-like';
            var baseClassDislike = ' .' + handler.baseClass + '-ratio-bar .' + handler.baseClass + '-ratio-dislike';
            var baseClassLoading = ' .' + handler.baseClass + '-ratio-bar.' + handler.baseClass + '-ratio-bar-load .' + handler.baseClass + '-ratio-like,';
                baseClassLoading += ' .' + handler.baseClass + '-ratio-bar.' + handler.baseClass + '-ratio-bar-load .' + handler.baseClass + '-ratio-dislike';
                
            if (handler.cfg.ratioLikeColor) {
                response.css += baseClassLike + ' { background : ' +  handler.cfg.ratioLikeColor + '}' + "\n\r";
            }
            if (handler.cfg.ratioDislikeColor) {
                response.css += baseClassDislike + ' { background : ' +  handler.cfg.ratioDislikeColor + '}' + "\n\r";
            }
            if (handler.cfg.ratioLoadingColor) {
                response.css += baseClassLoading + ' { background : ' + handler.cfg.ratioLoadingColor + '}' + "\n\r";
            }
            
            for (var i = 0; i < handler.requestsCfg.enabledApis.length; i++) {
                var apiId = handler.requestsCfg.enabledApis[i];
                var api = handler.cfg.apis.cfg[apiId];
                if (api.ratioLoadingColor) response.css += '.' + handler.baseClass + '-' + apiId + '-bar' + baseClassLoading + ' { background : ' + api.ratioLoadingColor + '}' + "\n\r";
                if (api.ratioDislikeColor) response.css += '.' + handler.baseClass + '-' + apiId + '-bar' + baseClassDislike + ' { background : ' + api.ratioDislikeColor + '}' + "\n\r";
                if (api.ratioLikeColor) response.css += '.' + handler.baseClass + '-' + apiId + '-bar' + baseClassLike + ' { background : ' + api.ratioLikeColor + '}' + "\n\r";                     
            }
            
            if (style.styleSheet){
                style.styleSheet.cssText = response.css;
            } else {
                style.appendChild(document.createTextNode(response.css));
            }
            
        });
    }
    
    function resetNavigation() {

        handler.log('Navigation finish', true);
        if (handler.ytRequest) handler.ytRequest.abort();
        
        if (updateTimer !== false) clearTimeout(updateTimer);
        if (initTimer !== false) clearTimeout(initTimer);
        
        lastVideoId = false;
        initTimer = false;
        updateTimer = false;
        handler.ytRequest = false;
        
        if (handler.getTooltip().isShown()) handler.getTooltip().show(false);
        
        if (handler.dislikeBtn) handler.dislikeBtn.style.opacity = 0.2;
        setTimeout(updateRatioWidth, 200);
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
                    onMouseOut : function(self, e) {},                    
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
        
    this.updatePageStateDelayed = function(d, context) {
                
        if (updateTimer !== false) clearTimeout(updateTimer);
        
        updateTimer = setTimeout(function() {
            updateTimer = false;
            updatePageState();
        }, d ? d : 300);
    }
    
    this.updatePageStateWaitDomReady = function() {
        
        if (window.location.href.indexOf('watch?') == -1) {
            
            handler.log('[getPageDom] Video page not found. Wait next navigation', true);
            handler.buttonsWraper = false;
            handler.dislikeBtn = false;
            
            return false;
        }
        
        if (!getPageDom()) {
            
            handler.log('[updatePageStateWaitDomReady] Wait dom ready...', true);
            initTimer = setTimeout(handler.updatePageStateWaitDomReady, 200);
            return;
        }
    
        handler.log('[updatePageStateWaitDomReady] Init extension dom and env', true);
        updatePageState();
    }
        
    this.init = function() {
        
        if (window.location !== window.parent.location) return;  // iframe mode

        KellyStorage.load(function(cfg) {
            
            handler.cfg = cfg;  
            
            handler.requestsCfg.enabledApis = [];
            
            for (var i = 0; i < handler.cfg.apis.order.length; i++) {
                var apiId = handler.cfg.apis.order[i];
                if (handler.cfg.apis.cfg[apiId].enabled) handler.requestsCfg.enabledApis.push(apiId);
            }
                        
            initCss();
            
            if (isMobile()) {
                
                // todo - replace by navigation-finish event if analog exists for mobile version
                
                handler.log('mobile version controller', true);
                
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
                                
                            resetNavigation();  
                            handler.updatePageStateDelayed(200, 'video-action-buttons');
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
                handler.updatePageStateDelayed(0, 'init-mobile');
                
            } else { 
            
                handler.log('desktop version controller', true);
                
                document.addEventListener('yt-navigate-finish', function (e) {
                                      
                    initCss();
                    resetNavigation();  
                    
                    handler.updatePageStateWaitDomReady();
                });
                    
                handler.updatePageStateWaitDomReady();
            }
                                
            document.addEventListener('click', function (e) {
                
                if (!handler.buttonsWraper) return;
                
                // ToDo : ratioBar is placed to first button, that requires addition check
                // if place rationBar to main wrapper it could be removed by youtube js renderer - posible to replace to poition abolute tooltip if needed
                
                if (handler.ratioBar && (handler.getTooltip().isChild(e.target, handler.ratioBar)) || e.target == handler.ratioBar) {
                    return false;
                }
                
                if (handler.getTooltip().isChild(e.target, handler.buttonsWraper.children[0]) || 
                    handler.getTooltip().isChild(e.target, handler.buttonsWraper.children[1])) {
                    
                    if (lastVideoId && browsingLog[lastVideoId]) {
                        actionRequest(getRatingState());
                    } 
                    
                    // drop cache if needed to resend request                    
                    // browsingLog[lastVideoId] = false;
                    
                    resetNavigation(); 
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