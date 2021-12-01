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
            
            loops : 1,
            loopsMax : 4,
            
            failTimeoutApi : 500,
            failTimeoutAR  : 0,
            
            forceApi : false,
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
                
        handler.ratioBar.onmouseover = function (e) { 
            
           var additionNotice = '';
           
           if (handler.cfg.showSourceEnabled) {
               additionNotice += ' [' + (ydata.source ? ydata.source : 'unknown') + ']';
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
           handler.getTooltip().show(true);           
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
    
    function getYTData(src, onLoad) {
        
        handler.log('begin query to : ' + src, true);
        
        var bgRequest = new Object();
            bgRequest.abort = function(silent) {
                handler.log('[getYTData] Reset data request controller', true);
                bgRequest.canceled = true;
            }
            
        KellyTools.getBrowser().runtime.sendMessage({
          
            method: "getYoutubeInfo", 
            src : src,
            timeout : handler.cfg.rTimeout,
            useApi : src.indexOf('youtube.com/watch') == -1, 

        }, function(response) {
              if (bgRequest.canceled) return;
              
              if (response.error) handler.log('[getYTData] error : ' + response.error, true);
              
                   if (response.ydata) { response.ydata.source = 'Api'; onLoad(response.ydata); } 
              else if (response.ydataRaw) onLoad(parseYTPage(response.ydataRaw));
              else onLoad(false, '[getYTData] error : ' + response.error);  
        });
        
        return bgRequest;
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
        
    function prepareRequestStart(force) {
        
        if (handler.requestsCfg.loops > handler.requestsCfg.loopsMax) {
            handler.log('[updatePageState] max requests loops reached ' + handler.requestsCfg.loops, true); 
            return false;   
        }
        
        if (document.getElementById('sentiment') && !document.getElementById('sentiment').hidden) {
            handler.log('[updatePageState] some sentiment data already exist', true); 
            return false;
        };
        
        var videoId = getVideoId();
        if (!videoId) {
            handler.log('[updatePageState] cant detect videoId id', true);
            return false;
        }
                
        
        if (!force && lastVideoId == videoId) {
            handler.log('[updatePageState] same video id - skip : ' + lastVideoId, true);
            return false;
        }
        
        getPageDom();
        lastVideoId = videoId;
        lastVideoYData = false;
        
        if (handler.ytRequest) handler.ytRequest.abort();
        
        return videoId;
    }
        
    function updatePageStateByDriver(driver, force) {
        
        if (!driver) driver = 0;
        handler.log('[updatePageStateByDriver] update [' + driver + '] [qn : ' + handler.requestsCfg.loops + ']', true); 
        var videoId = prepareRequestStart(force);
        if (!videoId) return;
        
        var cUrl = 'https://catface.ru/api/youtube/?videoId=' + videoId;
        var driverUrl = [
            cUrl, cUrl, cUrl, 
        ];

        handler.ytRequest = getYTData(driverUrl[driver], function(ydata) {

           handler.log('[API] result data : ', true);
           handler.log(ydata, true);
           handler.ytRequest = false;
           getPageDom();
           if (!showYData(ydata, 'getYTData.regular')) {

                handler.log('[updatePageStateByDriver] fail to load. Driver ' + driver, true);
                driver++;

                if (driver <= driverUrl.length-1) updatePageStateByDriver(driver, true);
                else {
                    handler.log('[updatePageStateByDriver] API unavailable - enter to updatePageStateByAR mode', true);
                        
                    if (handler.requestsCfg.failTimeoutApi) handler.dislikeBtn.innerText = '??';
                    
                    setTimeout(function() {handler.requestsCfg.loops++; updatePageStateByAR(false, true); }, handler.requestsCfg.failTimeoutApi);
                }
           }
        }); 
    }
    
    function updatePageStateByAR(attempt, force) {
        
        var maxAttempts = 3;
        if (!attempt) attempt = 1;
        
        handler.log('[updatePageStateByAR] update [' + attempt + '/' + maxAttempts + '] [qn : ' + handler.requestsCfg.loops + ']', true); 
        var videoId = prepareRequestStart(force);
        if (!videoId) return;
                
        if (handler.ratioBar) handler.ratioBar.classList.add(handler.baseClass + '-ratio-bar-load');
                
        if (browsingLog[videoId] && browsingLog[videoId].ydata && showYData(browsingLog[videoId].ydata, 'getYTData.existData')) return;
        
        handler.ytRequest = getYTData('https://www.youtube.com/watch?v=' + videoId + '&app=desktop', function(ydata, error) {
            
            getPageDom();     
            handler.ytRequest = false;
            if (!error) {
                browsingLog[videoId] = { ydata : ydata };
                
                handler.log('[Meta] result data : ', true);
                handler.log(ydata, true);
                
                if (!showYData(browsingLog[videoId].ydata, 'getYTData.newData')) error = 'dataParserError'; // parser deprecated ? - imidiatly go to api methods
            }

            if (error) {
                
                if (error != 'dataParserError' && attempt+1 <= maxAttempts) updatePageStateByAR(attempt+1, true);
                else {
                    handler.log('[updatePageStateByAR] parser deprecated or data not available - enter to updatePageStateByDriver mode', true);
                    
                    if (handler.requestsCfg.failTimeoutAR) handler.dislikeBtn.innerText = '??';
                
                    setTimeout(function() {handler.requestsCfg.loops++; updatePageStateByDriver(false, true); }, handler.requestsCfg.failTimeoutApi);
                }
            }                    
        });
    }
    
    function updatePageState() {
        
        // Priority -> [page data rating meta data] -> [drivers] by default
        handler.requestsCfg.loops = 1;
        
        if (handler.requestsCfg.forceApi) updatePageStateByDriver();
        else updatePageStateByAR();
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
            
            // statistic disabled \ zero - cleanup counters as possible
            if (lastVideoYData.dislikes === 0 && lastVideoYData.likes === 0) {
                
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
            handler.requestsCfg.forceApi = handler.cfg.forceApiEnabled;
            
            if (isMobile()) {
                
                // todo - replace by navigation-finish event if analog exists for mobile version
                
                handler.log('mobile version controller', true);
                
                var mobileMutationDelayRedraw = function() {
            
                    getPageDom(); 
                    if (lastVideoYData) showYData(lastVideoYData, 'getYTData.redraw');
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