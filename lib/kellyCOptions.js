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
    
    KellyCOptions.showPage = function(cfg) {
        
        var handler = KellyCOptions, html = '';        
            handler.page = document.getElementById('page');
            handler.title = handler.getLoc('ext_name') + ' v' + (KellyTools.getBrowser().runtime.getManifest ? KellyTools.getBrowser().runtime.getManifest().version : '');
            handler.copyright = ' &copy; <a href="htt' + 'ps://ke' + 'lly.cat' + 'face.ru/" target="_blank">nrad' + 'iowave</a> |\
                                 <a href="htt' + 'ps://gith' + 'ub.com/NC22/KellyC-Return-YouTube-Dislikes">' + handler.getLoc('support_link') + '</a>';
        
        document.title = handler.title;        
        KellyTools.setHTMLData(document.getElementById('header'), handler.title + handler.copyright); 
        KellyTools.setHTMLData(document.getElementById('chick-advice'), handler.getLoc('chik_advice'));

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
                 
                 html += '<div class="' + handler.baseClass + '-row' + '">\
                                <div class="' + handler.baseClass + '-row-title"><label>' + optional + title + '</label></div>';
                                
                 if (KellyStorage.fields[key].type) {
                        html += '<div class="' + handler.baseClass + '-row-input">\
                                    <input id="option-' + key + '" placeholder="' + title + '" value="' + KellyStorage.validateCfgVal(key, cfg[key]) + '">\
                                </div>';
                 }   
                 
                 html += '</div>'; 
             }             
        }
        
        html += '<div class="' + handler.baseClass + '-save"><button class="' + handler.baseClass + '-save-btn">' + handler.getLoc('save') + '</button></div>\
                 <div class="' + handler.baseClass + '-result"></div>';
           
        KellyTools.setHTMLData(handler.page, html);
        
        var spoilers = document.getElementsByClassName(handler.baseClass + '-additions-show');
        for (var i = 0; i < spoilers.length; i++) {
            spoilers[i].onclick = function() {
                    var additions = document.getElementById(this.getAttribute('data-for'));
                    additions.classList.contains('show') ? additions.classList.remove('show') : additions.classList.add('show');
            };
        }
        
        KellyTools.getElementByClass(handler.page, handler.baseClass + '-save-btn').onclick = function() {
                
                KellyStorage.lastValidateError = false;
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
                
                if (KellyStorage.lastValidateError) KellyCOptions.showNotice(KellyStorage.lastValidateError, true);
                else {
                    KellyStorage.save(data, function(error) {  
                        KellyCOptions.showNotice(handler.getLoc('save_' + (error ? 'error' : 'ok')), error);
                    });
                }
            };
    }
    
    KellyCOptions.init = function() {        
        KellyStorage.load(this.showPage);                
    }    