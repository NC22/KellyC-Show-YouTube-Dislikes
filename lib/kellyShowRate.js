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
        handler.dislikeBtn = false;
        handler.likeBtn = false;
        handler.ytRequest = false;
        
        handler.requestsCfg = {
            
            enabledApis : [],
            
            loops : 1,
            loopsMax : 4,
        }
        
    function getDefaultBGRequest() {
        return {
            method: "getYoutubeInfo",
            timeout : handler.cfg.rTimeout,
        }
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
    
    function getUserName() {
        // todo check mobile
        var nameEl = document.getElementById('account-name');
        return nameEl ? nameEl.title : false;
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
        
        if (isMobile()) handler.ratioBar.classList.add(handler.baseClass + '-ratio-bar-mobile');
        
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
               additionNotice += '<div class="' + handler.baseClass + '-api-datasource">Data source : </div>';
               additionNotice += '<div class="' + handler.baseClass + '-api-copyright">' + KellyStorage.apis[ydata.apiId].name + '</div>';
               additionNotice += '<div class="' + handler.baseClass + '-api-copyright-url"><a href="' + KellyStorage.apis[ydata.apiId].link + '"' + KellyStorage.apis[ydata.apiId].link + '</a></div>';
           }
           
           handler.getTooltip().setMessage(dFormat(ydata.likes) + ' / ' + dFormat(ydata.dislikes) + additionNotice);
           
           handler.getTooltip().updateCfg({
                target : handler.ratioBar, 
                offset : {left : 0, top : 12}, 
                positionY : 'bottom',
                positionX : 'left',                
                ptypeX : 'inside',
                ptypeY : 'outside',
                avoidOutOfBounds : false,
           });
           
           if (stick) {
               handler.getTooltip().updateCfg({closeButton : true});
           }
           
           handler.getTooltip().show(true);
        }
        
        handler.ratioBar.onmouseover = function(e){
            showTip(e);
        }
        
        handler.ratioBar.onclick = function(e){
            showTip(e, true);
        }
        
        handler.ratioBar.onmouseout = function(e) {
            
            var related = e.toElement || e.relatedTarget;
            if (handler.getTooltip().isChild(related)) return;
            
            handler.getTooltip().show(false);
        }
    }
    
    function parseYTPage(docRawText) {
        
        var parser = new DOMParser();
        var doc = parser.parseFromString(docRawText, 'text/html');
              
        var publicData = {likes : false, dislikes : false, count : false, rating : false, utDislikes : false, source : 'Rating', likesDisabled : false};
        var pairs = {LIKE : 'likes', DISLIKE : 'dislikes'};
        var scripts = doc.getElementsByTagName('SCRIPT'), counter = doc.querySelector('[itemprop="interactionCount"]'), found = {};

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

                    var pageDataRegExp = /\"topLevelButtons\"\:\[\{([\s\S]*)watch-dislike\"\}/g;
                    var pageData = pageDataRegExp.exec(scripts[i].innerHTML);
                    var data = JSON.parse('[{' + pageData[1] + '"}}]');
                    if (!data || data.length < 0) break;

                        data.forEach(function(item, index) {
                            if (typeof item.toggleButtonRenderer != 'undefined' && 
                                typeof item.toggleButtonRenderer.defaultIcon != 'undefined') {
                                item = item.toggleButtonRenderer;
                                if (item.defaultText.accessibility && typeof pairs[item.defaultIcon.iconType] != 'undefined') {
                                    
                                    //console.log(item.defaultText.accessibility.accessibilityData.label);
                                    var num = parseInt(item.defaultText.accessibility.accessibilityData.label.replace(/[^0-9]/g,''));
                                    if (!isNaN(num)) publicData[pairs[item.defaultIcon.iconType]] = num;
                                    
                                    // keep title of buttons
                                }
                            }
                        });

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
        }
        
        if (publicData.dislikes === false && publicData.rating && publicData.count && publicData.likes) {
            publicData.utDislikesT = Math.round((publicData.likes / publicData.rating) * 5 - publicData.likes); // -- not so accurate
            publicData.utDislikes = Math.round(publicData.likes * ((5 - publicData.rating) / (publicData.rating - 1)));
            publicData.dislikes = publicData.utDislikes;
        }   
        
        return publicData; 
    }
    
    function getYTData(cfg, onLoad) {
        
        handler.log('begin query to : ' + cfg.url, true);
        
        var bgRequest = new Object();
            bgRequest.abort = function(silent) {
                handler.log('[getYTData] Reset data request controller', true);
                bgRequest.canceled = true;
            }
            
        var requestBg = getDefaultBGRequest();
            requestBg.src = cfg.url;
            requestBg.requestCfg = cfg;
            
        KellyTools.getBrowser().runtime.sendMessage(requestBg, function(response) {
              if (bgRequest.canceled) return;
              
              if (response.status == 404 && cfg.apiId == 'sponsorsBlock') {
                  response.error = false; // https://wiki.sponsor.ajay.app/w/API_Docs/Ratings -- 404: No ratings for that type + videoID combination exist
                  response.ydata = {likes : 0, dislikes : 0};
              }
              
              if (response.error) handler.log('[getYTData] error : ' + response.error, true);
              
              if (response.ydata) {
                  
                  if (cfg.apiId == 'youtubeMetric') {
                      response.ydata = parseYTPage(response.ydata);                  
                  }
                  
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
        
        if (!browsingLog[videoId]) browsingLog[videoId] = {actions : '', ydata : false};
        
        if (handler.ytRequest) handler.ytRequest.abort();
         
        if (handler.ratioBar) handler.ratioBar.classList.add(handler.baseClass + '-ratio-bar-load');

        // check history data before request - clean history if needed before request
        
        if (browsingLog[videoId].ydata && showYData(browsingLog[videoId].ydata, '[prepareRequestStart].existData')) {
            return onReady(false, 'data already loaded before : ' + lastVideoId);
        }
        
        var apiCfg = KellyStorage.apis[handler.currentApi];
        
        var requestCfg = {
            
            apiId : handler.currentApi,
            videoId : videoId, 
            url : KellyStorage.apis[handler.currentApi].api.replace('__VIDEOID__', videoId),
            maxAttempts : apiCfg.maxAttempts ? apiCfg.maxAttempts : 3,
            nextDriverTimeout : typeof apiCfg.nextDriverTimeout != 'undefined' ? apiCfg.nextDriverTimeout : 500,
            fetchParams : apiCfg.fetchParams ? apiCfg.fetchParams : false, // default GET request without coockies
        };
        
        if (handler.currentApi == 'youtubeMetric') {
            requestCfg.asText = true;
        }
        
        // apis thats protects and salt id parametr
        
        if (handler.currentApi == 'sponsorsBlock') {
            
            KellyTools.getSha256Hash(videoId).then(function(hash) {
                
                if (lastVideoId != videoId) {
                    handler.log('[prepareRequestStart] environment changed - exit without callback', true);
                    return;
                } 
                
                requestCfg.url = requestCfg.url.replace('__VIDEOIDSHA256__', hash.slice(0, 4)); 
                
                onReady(requestCfg); 
            });
            
        } else onReady(requestCfg);
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
                }

                if (error) {
                    
                    if (error != 'dataParserError' && attempt+1 <= requestCfg.maxAttempts) updatePageStateByAR(true, attempt+1);
                    else {
                        handler.log('[updatePageStateByAR] parser deprecated or data not available', true);
                        
                        if (requestCfg.nextDriverTimeout) handler.dislikeBtn.innerText = '??';
                    
                        setTimeout(function() { updatePageState(true); }, requestCfg.nextDriverTimeout);
                    }
                }                    
            });
        });
        
    }
    
    function prepareActionRequestStart(apiId, type, undo, onReady) {
         
         if (!KellyStorage.apis[apiId].sync) {
             onReady(false, 'Sync data not supported by API ' + apiId);
             return;
         }
         
         var videoId = lastVideoId;
         var login = getUserName();
         if (!login || !videoId || state == 'neutral' || !browsingLog[lastVideoId]) {
             onReady(false, 'Not enough parametrs to identify action [l:' + login + ' |v: ' + videoId + ' |s: ' + state + ' | ' + (browsingLog[lastVideoId] ? 'history OK' : 'history NO'));
             return;
         }
         
         if (undo) browsingLog[lastVideoId]['action_' + type] = false;
         else browsingLog[lastVideoId]['action_' + type] = true;
         
         if (apiId == 'sponsorsBlock') {
             
             KellyTools.getSha256Hash(login).then(function(hash) {
                 if (lastVideoId != videoId) {
                     onReady(false, 'Request depricated, navigation changed');
                     return;
                 }
                 
                var formData = new FormData();
                    formData.append("userID", hash);
                    formData.append("videoID", lastVideoId);
                    formData.append("type", state == 'disliked' ? 0 : 1);
                    formData.append("enabled", undo ? "false" : "true"); // false for undo
                    
                var cfg = {
                    src : api.apiAction,
                    fetchParams : { 
                        method: 'POST',  
                        body : formData,
                    }
                };
                    
                 onReady(cfg);
             });
            
         } else onReady(false, 'prepareActionRequestStart not implemented for API ' + apiId);
    }
    
    function actionRequest(type) {
        
        if (!type || type == 'neutral') return false;
        if (!lastVideoId) return false;
        
        for (var apiId in KellyStorage.apis) {  
            if (!KellyStorage.apis[apiId].sync || !handler.cfg.apis.cfg[apiId].syncData) continue;

            if (apiId == 'sponsorsBlock') {
                
                var undo = browsingLog[lastVideoId]['action_' + type];
                prepareActionRequestStart(apiId, type, undo, function(requestCfg, error) {
                    
                    if (!requestCfg) {
                        handler.log('[actionRequest] Fail to create request config : ' + error, true);
                        return;
                    }
                    
                    KellyTools.getBrowser().runtime.sendMessage(requestCfg, function(response) {
                          if (response.error) handler.log('[actionRequest] Request error : ' + response.error, true);
                          
                          if (response.ydata) handler.log(response.ydata);
                          else onLoad(false, '[actionRequest] Request error : ' + response.error);  
                    }); 
                  
                });
            }
        }
    }
    
    function updatePageState(nextLoop) {
        
        if (handler.requestsCfg.enabledApis.length <= 0) {
            handler.log('[updatePageState] All requests APIs disabled', true);
            return;
        }
        
        if (!nextLoop) handler.requestsCfg.loops = 1;
        else handler.requestsCfg.loops++;
        
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
            
                    
            if (handler.cfg.ratioLikeColor) {
                response.css += ' .' + handler.baseClass + '-ratio-bar .' + handler.baseClass + '-ratio-like { background : ' +  handler.cfg.ratioLikeColor + '}' + "\n\r";
            }
            if (handler.cfg.ratioDislikeColor) {
                response.css += ' .' + handler.baseClass + '-ratio-bar .' + handler.baseClass + '-ratio-dislike { background : ' +  handler.cfg.ratioDislikeColor + '}' + "\n\r";
            }
            if (handler.cfg.ratioLoadingColor) {
                response.css += ' .' + handler.baseClass + '-ratio-bar.' + handler.baseClass + '-ratio-bar-load .' + handler.baseClass + '-ratio-like,';
                response.css += ' .' + handler.baseClass + '-ratio-bar.' + handler.baseClass + '-ratio-bar-load .' + handler.baseClass + '-ratio-dislike { background : ' + handler.cfg.ratioLoadingColor + '}' + "\n\r";
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
        
        initTimer = false;
        updateTimer = false;
        handler.ytRequest = false;
        
        if (handler.dislikeBtn) handler.dislikeBtn.style.opacity = 0.2;
        setTimeout(updateRatioWidth, 200);

    }
        
    this.getTooltip = function() {

        if (!handler.tooltip) {
            KellyTooltip.autoloadCss = handler.baseClass + '-tool-group';
            handler.tooltip = new KellyTooltip({
            
                // classGroup : env.className + '-tooltipster', 
                // selfClass : env.hostClass + ' ' + env.className + '-Default-tooltipster',
                closeButton : false,
                closeByBody : true,
                
                classGroup : handler.baseClass + '-tool-group',
                selfClass : handler.baseClass + '-tool',
                events : {                 
                    onMouseOut : function(self, e) {
                    },                    
                    onClose : function(self) {},                
                }, 
                
            });
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
                        
                        resetNavigation();                    
                        initCss();
                        
                        handler.updatePageStateWaitDomReady();
                    });
                    
                    handler.updatePageStateWaitDomReady();
            }
                                
            document.addEventListener('click', function (e) {
                
                if (!handler.buttonsWraper) return;
                
                if (lastVideoId && browsingLog[lastVideoId]) {
                    actionRequest(getRatingState());
                }
                
                if (handler.getTooltip().isChild(e.target, handler.buttonsWraper.children[0]) || 
                    handler.getTooltip().isChild(e.target, handler.buttonsWraper.children[1])) {
                        
                    // drop cache if needed - currently actions +\- can deprecate after navigation
                    
                    // browsingLog[lastVideoId] = false;
                    //                     
                    // lastVideoYData = false;
                    
                    lastVideoId = false;
                    resetNavigation(); 
                    handler.updatePageStateWaitDomReady();
                }
            });
        });
        
        initCss();
    }    
};

KellyShowRate.getInstance = function() {
    if (typeof KellyShowRate.instance == 'undefined') KellyShowRate.instance = new KellyShowRate();
    return KellyShowRate.instance;
}