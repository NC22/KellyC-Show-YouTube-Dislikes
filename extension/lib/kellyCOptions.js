// part of kellyShowRate extension, see kellyShowRate.js for copyrights and description

var KellyCOptions = new Object(); 
    KellyCOptions.baseClass = 'kelly-options';
    
    KellyCOptions.reportIssue = 'https://github.com/NC22/KellyC-Return-YouTube-Dislikes/issues';
    KellyCOptions.getLoc = function(key) {
        return KellyTools.getLoc(key);
    }
    
    KellyCOptions.showNotice = function(notice, error) {
    
        var result = this.page.getElementsByClassName(this.baseClass + '-result')[0];
            result.innerText = notice;
            result.classList.add('show');
            
        error ? result.classList.add('error') : result.classList.remove('error');
    }
        
    KellyCOptions.saveForm = function() {
        
        KellyStorage.lastValidateError = false;
        
        var handler = KellyCOptions;
        var data = {}, field;
        
        for (var key in KellyStorage.fields) {                        
            if (KellyStorage.fields[key].type) {
                field = document.getElementById('option-' + key);                        
                data[key] = field ? KellyStorage.validateCfgVal(key, field.value) : KellyStorage.fields[key].default;
            }
            
            if (KellyStorage.fields[key].optional) {
                field = document.getElementById('option-' + key + '-enabled');                        
                data[key + 'Enabled'] = field ? field.checked : KellyStorage.fields[key].defaultOptional;                        
            }
        }
        
        KellyCOptions.saveDataSourcesForm(data);
        
        if (KellyStorage.lastValidateError) handler.showNotice(KellyStorage.lastValidateError, true);
        else {
            KellyStorage.save(data, function(error) {  
                handler.showNotice(handler.getLoc('save_' + (error ? 'error' : 'ok')), error);
            });
        }
    }
        
    KellyCOptions.saveDataSourcesForm = function(data) {
        
        data.apis = {
            order : KellyCOptions.cfg.apis.order,
            cfg : {},
        }
        
        for (var key in KellyStorage.apis) {  
            var cfg = {
                enabled : document.getElementById('data-source-enabled-' + key).checked,
            }
            
            if (KellyStorage.apis[key].sync) {
                cfg.syncData = document.getElementById('data-source-sync-' + key).checked; 
            }
            
            if (document.getElementById(key + '-ratioLikeColor').value) {
                cfg.ratioLikeColor = document.getElementById(key + '-ratioLikeColor').value;
            }
            
            if (document.getElementById(key + '-ratioDislikeColor').value) {
                cfg.ratioDislikeColor = document.getElementById(key + '-ratioDislikeColor').value;
            }
            
            data.apis.cfg[key] = cfg;
        }
        
        console.log(data);
    }
    
    KellyCOptions.addDataSources = function() {
        
         var handler = KellyCOptions; 
         var datasourcesEl = document.querySelector('#spoiler-__datasources__ .' + handler.baseClass + '-additions');                
         if (!datasourcesEl) return false;
         
         var html = '';
         
         for (var i = 0; i < handler.cfg.apis.order.length; i++) {
            
            var key = handler.cfg.apis.order[i];
            
            html += '<div class="data-source" id="data-source-' + key + '">';

            html += '<div class="data-source-controlls">';
            html += '<label for="data-source-enabled-' + key + '">\
                        <input type="checkbox" id="data-source-enabled-' + key +'" data-target="' + key +'" ' + (handler.cfg.apis.cfg[key].enabled ? 'checked' : '') + '>' + handler.getLoc('datasource_get') + '\
                     </label>';
            
            if (KellyStorage.apis[key].sync) {
                html += '<label for="data-source-sync-' + key + '">\
                        <input type="checkbox" id="data-source-sync-' + key +'" data-target="' + key +'" ' + (handler.cfg.apis.cfg[key].syncData ? 'checked' : '') + '>'  + handler.getLoc('datasource_send') + '</label>';
            }
            
            html += '<div class="data-source-actions">\
                        <a href="#" class="data-source-color" data-target="' + key +'">'  + handler.getLoc('datasource_colors') + '</a>&nbsp;&nbsp;\
                        <a href="#" class="data-source-priority data-source-priority-up" data-target="' + key +'">▲</a>\
                        <a href="#" class="data-source-priority data-source-priority-down" data-target="' + key +'">▼</a>\
                    </div>';
            html += '</div><div class="data-source-card">';
                    
            html += '<input type="hidden" id="' + key + '-ratioLikeColor" value="' + KellyTools.val(handler.cfg.apis.cfg[key].ratioLikeColor) + '">\
                     <input type="hidden" id="' + key + '-ratioDislikeColor" value="' + KellyTools.val(handler.cfg.apis.cfg[key].ratioDislikeColor) + '">';
                     
            if (handler.picker) html += '<div class="data-source-colorpicker"></div>';
                
            html += '<div class="data-source-name">\
                        <span class="data-source-index">' + (i+1) + '</span>&nbsp;\
                        <span class="data-source-name-text" style="' + (KellyStorage.apis[key].color ? 'color : ' + KellyStorage.apis[key].color + ';' : '') +'">' + KellyStorage.apis[key].name + '</span>\
                     </div>';
            
            html += '<div class="data-source-links">';
                         
            if (KellyStorage.apis[key].desc !== false) {
                html += '<a class="data-source-desc-show" data-target="' + key + '" href="' + KellyStorage.apis[key].ppLink + '">'  + handler.getLoc('datasource_desc') + '</a>';
            } 
            
            if (KellyStorage.apis[key].link) {
                html += '<a class="data-source-link" href="' + KellyStorage.apis[key].link + '" target="_blank">'  + handler.getLoc('datasource_home') + '</a>';
            }
            
            // can be outdated, keep link to homepage for now
            //
            // if (KellyStorage.apis[key].donate) {
            //    html += '<a href="' + KellyStorage.apis[key].donate + '" target="_blank">'  + handler.getLoc('datasource_donate') + '</a>';
            // }
            //
            // if (KellyStorage.apis[key].ppLink) {
            //    html += '<a href="' + KellyStorage.apis[key].ppLink + '" target="_blank">'  + handler.getLoc('datasource_pp') + '</a>';
            // }
            
            html += '</div>';
            
            if (KellyStorage.apis[key].desc !== false) {
                html += '<div class="data-source-desc" id="data-source-desc-' + key + '">' + handler.getLoc('datasource_id_' + key) + '</div>';
            }       
            
            html += '</div>';
            html += '</div>';
        } 
        
        html += '<div class="data-source-disclaimer">' + handler.getLoc('datasources_disclaimer') + '</div>';
        html += '<div class="data-source-reset"><a class="data-source-reset-button" href="#">' + handler.getLoc('reset_to_defaults')  + '</a></div>';

        KellyTools.setHTMLData(datasourcesEl, html);
        
        document.getElementsByClassName('data-source-reset-button')[0].onclick = function() {
            
            handler.cfg.apis = false;
            
            KellyStorage.validateCfgApis(handler.cfg);
            KellyCOptions.addDataSources();
            return false;
        }
        
        var mInputs = document.getElementsByClassName('data-source-color');
        for (var i = mInputs.length-1; i >= 0; i--) {
            mInputs[i].onclick = function() { 
                
                var container = document.getElementById('data-source-' + this.getAttribute('data-target'));
                var colorRingConfigEl = document.getElementById('colorring-container');
                var colorpickerBlock = document.querySelector('#data-source-' + this.getAttribute('data-target') + ' .data-source-colorpicker');
                var enabled = !colorpickerBlock.classList.contains('enabled');       
                
                handler.hideDataSourceColorpickers();
                         
                if (enabled) {
                    
                    colorpickerBlock.appendChild(colorRingConfigEl);
                    colorpickerBlock.classList.add('enabled');
                    
                    handler.hideSpoiler('colorring');
                    handler.picker.selectTarget(this.getAttribute('data-target'), true);
                }
                
                return false;
            };
        }
        
        var mInputs = document.getElementsByClassName('data-source-priority');
        for (var i = mInputs.length-1; i >= 0; i--) {
            mInputs[i].onclick = function() { 
                
                handler.hideDataSourceColorpickers();
                var up = this.classList.contains('data-source-priority-up');
                var idKey = this.getAttribute('data-target');
                var index = handler.cfg.apis.order.indexOf(idKey);
                
                if (index == -1 || (up && index == 0)) {
                    return false;
                }
                
                if (!up && index == handler.cfg.apis.order.length - 1) {
                    return false;
                }
                
                if (!up && index == handler.cfg.apis.order.length - 1) {
                    return false;
                }
                
                var switchIndex = up ? index - 1 : index + 1;
                var switchIdKey = handler.cfg.apis.order[switchIndex]; 
                
                handler.cfg.apis.order[index] = switchIdKey;
                handler.cfg.apis.order[switchIndex] = idKey;
                
                var itemEl = document.getElementById('data-source-' + idKey);
                var itemIndexEl = itemEl.getElementsByClassName('data-source-index');
                    itemIndexEl[0].innerText = switchIndex+1;
                    
                var switchItemEl = document.getElementById('data-source-' + switchIdKey);
                var switchItemIndexEl = switchItemEl.getElementsByClassName('data-source-index');
                    switchItemIndexEl[0].innerText = index+1;
                
                if (up) itemEl.parentNode.insertBefore(itemEl, switchItemEl);
                else itemEl.parentNode.insertBefore(switchItemEl, itemEl);
                
                itemEl.classList.add('fade');
                switchItemEl.classList.add('fade');
                setTimeout(function() { itemEl.classList.remove('fade'); switchItemEl.classList.remove('fade'); }, 200);
                
                return false;
            };
        }
        
        var mInputs = document.getElementsByClassName('data-source-desc-show');
        for (var i = mInputs.length-1; i >= 0; i--) {
            mInputs[i].onclick = function() { 
                
                var container = document.getElementById('data-source-desc-' + this.getAttribute('data-target'));
                if (!container.classList.contains('enabled')) {
                    container.classList.add('enabled');
                } else container.classList.remove('enabled');
                
                return false;
            };
        }

    }
    
    KellyCOptions.hideDataSourceColorpickers = function() {
        
        KellyCOptions.picker.selectTarget('option', false);
        
        var colorPickers = document.getElementsByClassName('data-source-colorpicker');
        for (var i = colorPickers.length-1; i >= 0; i--) {
            colorPickers[i].classList.remove('enabled');
        }
    }
    
    KellyCOptions.hideSpoiler = function(key) {
        document.getElementById('spoiler-__' + key + '__').classList.remove('show');
    }
    
    KellyCOptions.initSpoilers = function() {
        
        var handler = KellyCOptions; 
        var spoilers = document.getElementsByClassName(handler.baseClass + '-additions-show');
        for (var i = 0; i < spoilers.length; i++) {
            spoilers[i].onclick = function(e) {
                    
                    if (e.target.classList.contains(handler.baseClass + '-row-help')) return;
                    
                    var additions = document.getElementById(this.getAttribute('data-for'));
                        additions.classList.contains('show') ? additions.classList.remove('show') : additions.classList.add('show');
                    
                    if (additions.id == 'spoiler-__colorring__') {
                        additions.getElementsByClassName(handler.baseClass + '-additions')[0].appendChild(document.getElementById('colorring-container'));
                        KellyCOptions.hideDataSourceColorpickers();
                        KellyCOptions.hideSpoiler('datasources');
                    } else if (additions.id == 'spoiler-__datasources__') {
                        KellyCOptions.hideSpoiler('colorring');
                    }
            };
            
            
        
            if (window.location.href.indexOf('datasources') != -1 && spoilers[i].getAttribute('data-for') == 'spoiler-__datasources__') {
                spoilers[i].click();
            }
        }
    }
    
    KellyCOptions.getTooltip = function() {

        var handler = KellyCOptions; 
        if (!handler.tooltip) {
            KellyTooltip.autoloadCss = handler.baseClass + '-tool-group';
            handler.tooltip = new KellyTooltip({
                closeButton : true,
                closeByBody : true,
                offset : {left : 40, top : -40}, 
                positionY : 'bottom',
                positionX : 'left',                
                ptypeX : 'inside',
                ptypeY : 'inside',
                target : 'screen',
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
    
    KellyCOptions.initHelps = function() {
        
        var handler = KellyCOptions; 
        var help = document.getElementsByClassName(handler.baseClass + '-row-help');
        for (var i = 0; i < help.length; i++) {
            help[i].onclick = function(e) {
                   
                   var html = '';
                   for (var i = 0; i <= 8; i++) {
                       var p = handler.getLoc(this.getAttribute('data-help') +  (i >= 1 ? '_' + i : ''));
                       if (p) html += '<p>' + p + '</p>';
                   }
                   
                   handler.getTooltip().setMessage(html);
           
                   handler.getTooltip().updateCfg({target : document.body});
                   handler.getTooltip().show(true);  
                    return false;
            };
        }
    }
    
    KellyCOptions.addColorRing = function() {
        
         var handler = KellyCOptions; 
         var colorRingConfigEl = document.querySelector('#spoiler-__colorring__ .' + handler.baseClass + '-additions');                
         if (!colorRingConfigEl) return false;
          
        var html = '\
            <div id="colorring-container">\
            <div class="colorring-ratio-preview">\
                <div class="colorring-ratio-preview-like" style="width : 70%;"></div><div class="colorring-ratio-preview-dislike" style="width : 30%;"></div>\
            </div>\
            <canvas id="colorring-color"></canvas>\
            \
            <div class="colorring-inputs-list">\
            \
                <input class="colorring-input colorring-input-likes input-quad" data-cfg-name="ratioLikeColor">\
                <input class="colorring-input colorring-input-dislikes input-quad" data-cfg-name="ratioDislikeColor">\
                <input class="colorring-input colorring-input-loading input-quad" data-cfg-name="ratioLoadingColor">\
            \
            </div>\
            <div class="colorring-reset"><a class="colorring-reset-button" href="#">' + handler.getLoc('reset_to_defaults')  + '</a></div>\
            <div>';
            
        KellyTools.setHTMLData(colorRingConfigEl, html);
                 
        var picker = new KellyColorPicker({ 
                place : 'colorring-color',    
                userEvents : { 
                
                    change : function(self) {
                    
                        // work with your own variables that describe current selected input
                        
                        if (typeof self.selectedInput == 'undefined') return;
                        if (self.getCurColorHsv().v < 0.5)
                            self.selectedInput.style.color = "#FFF";
                        else
                            self.selectedInput.style.color = "#000";

                        self.selectedInput.value = self.getCurColorHex();    
                        self.selectedInput.style.background = self.selectedInput.value;   
                        self.updateRelatedCfg();
                    }
                    
                }
            });

        // addition user methods \ variables 
        
        picker.pickerTarget = 'option'; // cfg inputs pool prefix or id
        picker.clearInputForDefault = false;
        
        picker.selectTarget = function(targetPrefix, clearOnDefault) {
                
            picker.clearInputForDefault = clearOnDefault;
            picker.pickerTarget = targetPrefix;
            picker.initInputs();
        }
        
        picker.editInput = function(target) {
            
            if (picker.selectedInput) picker.selectedInput.classList.remove('selected');   
            if (target) picker.selectedInput = target;
            
            if (picker.selectedInput) {
                picker.selectedInput.classList.add('selected');    
                picker.setColor(picker.selectedInput.value);
            }
        }
        
        picker.updateRelatedCfg = function() {
            var cfgName = picker.selectedInput.getAttribute('data-cfg-name');
            
            var id = picker.pickerTarget + '-' + cfgName; 
            if (!document.getElementById(id)) {
                console.log('no related input for ' + id);
                return;
            }
            document.getElementById(id).value = picker.selectedInput.value;
            
            var preview = false;
            
                 if (cfgName == 'ratioLikeColor') preview = 'colorring-ratio-preview-like';
            else if ( cfgName == 'ratioDislikeColor' ) preview = 'colorring-ratio-preview-dislike';
               
            if (preview) document.getElementsByClassName(preview)[0].style.backgroundColor = picker.selectedInput.value;
        }
        
        picker.initInputs = function(toDefault) {
            
            var mInputs = document.getElementsByClassName('colorring-input');
            for (var i = mInputs.length-1; i >= 0; i--) {
                
                var targetInput = false;
                if (picker.pickerTarget) {
                    
                    handler.cfg[mInputs[i].getAttribute('data-cfg-name')]
                    targetId = picker.pickerTarget + '-' + mInputs[i].getAttribute('data-cfg-name'); 
                    targetInput = document.getElementById(targetId);
                }
                
                var defaultValue = KellyStorage.fields[mInputs[i].getAttribute('data-cfg-name')].default;
                var cfgValue = targetInput && targetInput.value ? targetInput.value : defaultValue;
                
                mInputs[i].value = toDefault ? defaultValue : cfgValue;
                picker.editInput(mInputs[i]);
                mInputs[i].onclick = function() { picker.editInput(this); };
                mInputs[i].onchange = function() { picker.editInput(this); };
                
                if (toDefault && picker.clearInputForDefault && targetInput) targetInput.value = '';
            }
        }
        
        document.getElementsByClassName('colorring-reset-button')[0].onclick = function() { picker.initInputs(true); return false;};
        picker.initInputs();
        
        handler.picker = picker;
    }
    
    KellyCOptions.showBgState = function(popup) {
        if (KellyStorage.bgFail) {
            var tEl = document.getElementsByClassName(KellyCOptions.baseClass + '-ext-name')[0];
                tEl.innerText = 'Browser restart requeired';
                tEl.style.color = '#c40000';
                
                if (!popup) {
                    KellyCOptions.getTooltip().setMessage('tewtwe');
                    KellyCOptions.getTooltip().show(true);
                }
            document.getElementsByClassName('kelly-copyright')[0].innerText = '';
            
            return true;
        } else return false;
    }
    
    KellyCOptions.showTitle = function() {
        
        var handler = KellyCOptions;        
            handler.page = document.getElementById('page');
            handler.title = handler.getLoc('ext_name') + ' v' + (KellyTools.getBrowser().runtime.getManifest ? KellyTools.getBrowser().runtime.getManifest().version : '');
            handler.titleHtml = '<span class="' + handler.baseClass + '-ext-name">' + handler.title + '</span><span class="kelly-copyright">created by <a href="https://kelly.catface.ru/" target="_blank">nradiowave</a></span>';
            
            handler.titleHtml += '<div class="' + handler.baseClass + '-report">\
                                    <a href="' + KellyCOptions.reportIssue + '" target="_blank">' + handler.getLoc('support_link') + '</a>\
                                    <a href="https://github.com/NC22/KellyC-Return-YouTube-Dislikes/wiki/Privacy-Policy" target="_blank">' + handler.getLoc('datasource_pp') + '</a>\
                                 </div>';
                    
        document.title = handler.title;        
        KellyTools.setHTMLData(document.getElementById('header'), handler.titleHtml); 

    }
    
    KellyCOptions.showPagePopup = function() {
                
        KellyCOptions.showTitle();
        if (KellyCOptions.showBgState(true)) return;
        
        var html = '';
            html += '<div class="' + this.baseClass + '-popup-go"><button class="' + this.baseClass + '-options-btn tab-navigation" data-source="/env/page/options.html">' + this.getLoc('options') + '</button></div>';
            
            html += '<button class="' + this.baseClass + '-additions-show tab-navigation" data-source="/env/page/options.html?spoiler=datasources">' + this.getLoc('show_datasources_popup') + '</button>';
            html += '<button class="' + this.baseClass + '-additions-show tab-navigation" data-source="' + KellyCOptions.reportIssue + '">' + this.getLoc('support_link') + '</button>';
            html += '<div class="disclaimer" data-source="' + KellyCOptions.reportIssue + '">' + this.getLoc('disclaimer') + '</button>';
                       
        KellyTools.setHTMLData(this.page, html);
        var mInputs = document.getElementsByClassName('tab-navigation');
        for (var i = 0; i < mInputs.length; i++) mInputs[i].onclick = function() {KellyTools.getBrowser().tabs.create({url: this.getAttribute('data-source')}, function(tab){});}; 
    }
    
    KellyCOptions.showPage = function(cfg) {
               
        var handler = KellyCOptions, html = '';   
            handler.cfg = cfg;
        
        if (document.body.classList.contains('popup-env')) {
            return KellyCOptions.showPagePopup(cfg); 
        }
        
        KellyCOptions.showTitle();
        if (KellyCOptions.showBgState()) return;
        
        for (var i = 0; i < KellyStorage.fieldsOrder.length; i++) {
             
             var helpHtml = KellyStorage.fieldsHelp.indexOf(KellyStorage.fieldsOrder[i]) != -1;
             if (helpHtml) helpHtml = '&nbsp;&nbsp;<a href="#" class="' + handler.baseClass + '-row-help" data-help="' + KellyStorage.fieldsOrder[i] + '_help">(?)</a>';
             else helpHtml = '';
             
             if (KellyStorage.fieldsOrder[i].indexOf('__') != -1) {
                 
                 var locKey =  KellyTools.replaceAll(KellyStorage.fieldsOrder[i], '__', '');
                 if (helpHtml) helpHtml = '&nbsp;&nbsp;<a href="#" class="' + handler.baseClass + '-row-help" data-help="' + locKey + '_help">(?)</a>';
                 
                 html += '<button class="' + handler.baseClass + '-additions-show" data-for="spoiler-' + KellyStorage.fieldsOrder[i] + '">\
                            ' + handler.getLoc('show_' + locKey) + helpHtml + '\
                          </button>\
                          <div class="' + handler.baseClass + '-additions-wrap" id="spoiler-' + KellyStorage.fieldsOrder[i] + '"><div class="' + handler.baseClass + '-additions">';
                          
             } else if (KellyStorage.fieldsOrder[i].indexOf('_/') != -1) {
                 
                 html += '</div></div>';
                 
             } else {
             
                 var key = KellyStorage.fieldsOrder[i];
                 var title = KellyStorage.fields[key].hidden ? key : handler.getLoc('option_' + key);
                 if (!title) title = key;
                 
                 title += helpHtml;
                 
                 var optional = '';
                 if (KellyStorage.fields[key].optional) {                     
                     optional += '<input type="checkbox" id="option-' + key + '-enabled" ' + (cfg[key + 'Enabled'] ? 'checked' : '') +'> ';
                 }
                 
                 if (KellyStorage.fields[key].hidden) {
                            
                    html += '<input id="option-' + key + '" type="hidden" value="' + KellyStorage.validateCfgVal(key, cfg[key]) + '">';
                    
                 } else {
                     
                     html += '<div class="' + handler.baseClass + '-row' + '">\
                                    <div class="' + handler.baseClass + '-row-title"><label>' + optional + title + '</label></div>';
                                    
                     if (KellyStorage.fields[key].type) { // type for validator \ display - todo - more types if needed
                            
                            html += '<div class="' + handler.baseClass + '-row-input">\
                                        <input id="option-' + key + '" placeholder="' + title + '" value="' + KellyStorage.validateCfgVal(key, cfg[key]) + '">\
                                    </div>';
                     } 
                 }  
                 
                 html += '</div>'; 
             }             
        }
        
        html += '<div class="' + handler.baseClass + '-save"><button class="' + handler.baseClass + '-save-btn">' + handler.getLoc('save') + '</button></div>\
                 <div class="' + handler.baseClass + '-result"></div>';
            
        if (KellyStorage.fieldsOrder.indexOf('option-ratioLikeColor') != -1) {
            html += KellyCOptions.getRatioColorRingHtml();
        }
        
        KellyTools.setHTMLData(handler.page, html);
                
        handler.page.getElementsByClassName(handler.baseClass + '-save-btn')[0].onclick = handler.saveForm;           
        KellyCOptions.initSpoilers(); 
        KellyCOptions.initHelps();     
        KellyCOptions.addColorRing();
        KellyCOptions.addDataSources();
    }
    
    KellyCOptions.init = function() {        
        KellyStorage.load(KellyCOptions.showPage);                
    }    