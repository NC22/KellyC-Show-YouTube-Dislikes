// part of kellyShowRate extension, see kellyShowRate.js for copyrights and description

var KellyCOptions = new Object(); 
    KellyCOptions.baseClass = 'kelly-options';
    
    KellyCOptions.getLoc = function(key) {
        return KellyTools.getLoc(key);
    }
    
    KellyCOptions.showNotice = function(notice, error) {
    
        var result = KellyTools.getElementByClass(this.page, this.baseClass + '-result');
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
        
        if (KellyStorage.lastValidateError) handler.showNotice(KellyStorage.lastValidateError, true);
        else {
            KellyStorage.save(data, function(error) {  
                handler.showNotice(handler.getLoc('save_' + (error ? 'error' : 'ok')), error);
            });
        }
    }
    
    KellyCOptions.addColorRing = function() {
        
         var handler = KellyCOptions; 
         var colorRingConfigEl = document.querySelector('#spoiler-__colorring__ .' + handler.baseClass + '-additions');                
         if (!colorRingConfigEl) return false;
          
        var html = '\
            \
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
            ';
            
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
            document.getElementById('option-' + cfgName).value = picker.selectedInput.value;
            
            var preview = false;
            
                 if (cfgName == 'ratioLikeColor') preview = 'colorring-ratio-preview-like';
            else if ( cfgName == 'ratioDislikeColor' ) preview = 'colorring-ratio-preview-dislike';
               
            if (preview) {
               document.getElementsByClassName(preview)[0].style.backgroundColor = picker.selectedInput.value;
            }
        }
        
        picker.initInputs = function(toDefault) {
            
            var mInputs = document.getElementsByClassName('colorring-input');
            for (var i = mInputs.length-1; i >= 0; i--) {
                mInputs[i].value = toDefault ? KellyStorage.fields[mInputs[i].getAttribute('data-cfg-name')].default : handler.cfg[mInputs[i].getAttribute('data-cfg-name')];
                picker.editInput(mInputs[i]);
                mInputs[i].onclick = function() { picker.editInput(this); };
                mInputs[i].onchange = function() { picker.editInput(this); };
            }
        }
        
        document.getElementsByClassName('colorring-reset-button')[0].onclick = function() { picker.initInputs(true); return false;};
        picker.initInputs();
    }
    
    KellyCOptions.showPage = function(cfg) {
        
        var handler = KellyCOptions, html = '';        
            handler.page = document.getElementById('page');
            handler.title = handler.getLoc('ext_name') + ' v' + (KellyTools.getBrowser().runtime.getManifest ? KellyTools.getBrowser().runtime.getManifest().version : '');
            handler.titleHtml = '<span class="' + handler.baseClass + '-ext-name">' + handler.title + '</span>';
            handler.copyright = '<span class="' + handler.baseClass + '-ext-copy">&nbsp;&copy;&nbsp;</span><a href="htt' + 'ps://ke' + 'lly.cat' + 'face.ru/" target="_blank">nrad' + 'iowave</a>\
                                 <a class="' + handler.baseClass + '-report" href="htt' + 'ps://gith' + 'ub.com/NC22/KellyC-Return-YouTube-Dislikes/issues">' + handler.getLoc('support_link') + '</a>';
        
            handler.cfg = cfg;
            
        document.title = handler.title;        
        KellyTools.setHTMLData(document.getElementById('header'), handler.titleHtml + handler.copyright); 

        for (var i = 0; i < KellyStorage.fieldsOrder.length; i++) {
             
             if (KellyStorage.fieldsOrder[i].indexOf('__') != -1) {
                 
                 html += '<button class="' + handler.baseClass + '-additions-show" data-for="spoiler-' + KellyStorage.fieldsOrder[i] + '">\
                            ' + handler.getLoc('show_' + KellyTools.replaceAll(KellyStorage.fieldsOrder[i], '__', '')) + '\
                          </button>\
                          <div class="' + handler.baseClass + '-additions-wrap" id="spoiler-' + KellyStorage.fieldsOrder[i] + '"><div class="' + handler.baseClass + '-additions">';
                          
             } else if (KellyStorage.fieldsOrder[i].indexOf('_/') != -1) {
                 
                 html += '</div></div>';
                 
             } else {
             
                 var key = KellyStorage.fieldsOrder[i];
                 var title = handler.getLoc('option_' + key);
                 if (!title) title = key;
                 
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
                
        KellyTools.getElementByClass(handler.page, handler.baseClass + '-save-btn').onclick = handler.saveForm;           
        
        var spoilers = document.getElementsByClassName(handler.baseClass + '-additions-show');
        for (var i = 0; i < spoilers.length; i++) {
            spoilers[i].onclick = function() {
                    var additions = document.getElementById(this.getAttribute('data-for'));
                    additions.classList.contains('show') ? additions.classList.remove('show') : additions.classList.add('show');
            };
        }
        
        KellyCOptions.addColorRing();
    }
    
    KellyCOptions.init = function() {        
        KellyStorage.load(this.showPage);                
    }    