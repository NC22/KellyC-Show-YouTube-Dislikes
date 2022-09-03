// part of kellyShowRate extension, see kellyShowRate.js for copyrights and description

KellyTools = {
    DEBUG : false,
    E_NOTICE : 1,
    E_ERROR : 2, 
    logBuffer : '',
}; 

    
KellyTools.isElInViewport = function(el) {
    
    if (!el) return false;
    
    var bounds = el.getBoundingClientRect();
    return bounds.top >= 0 && (bounds.top + bounds.height / 2) <= (window.innerHeight || document.documentElement.clientHeight);
}
    
KellyTools.nFormat = function(num) {
    
    if(num > 999 && num < 1000000) {
        
        return (num / 1000).toFixed(1) + "&nbsp;" + KellyTools.getLoc('num_k'); 
        
    } else if(num > 1000000) {
        
        return (num / 1000000).toFixed(1) + "&nbsp;" + KellyTools.getLoc('num_m');
        
    } else {
        
        return num.toString(); 
    }
}
    
KellyTools.dFormat = function(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
    
KellyTools.getLoc = function(key) {
    return KellyTools.getBrowser().i18n.getMessage(key);
}

KellyTools.loadFrontJs = function(callback, exclude) {
    var js = KellyTools.getBrowser().runtime.getManifest().content_scripts[0].js, loaded = 0, loadPool = [];

    for (var i = js.length-1; i >= 0; i--) {
        
        if (js[i].indexOf('init/') != -1) continue;
        
        var skip = false;
        for (var b = 0; b < exclude.length; b++) if (js[i].indexOf(exclude[b]) != -1) {
            skip = true; break;
        }
    
        if (skip) continue;
        var url = KellyTools.getBrowser().runtime.getURL(js[i]);
        if (url) loadPool.push(url);
        else KellyTools.log('cant init path ' + url, KellyTools.E_ERROR);
    }
    
    var load = function() {
        
        if (loadPool.length <= 0) {
            if (callback) callback();
        } else {
        
            var script = document.createElement('SCRIPT');
                script.src = loadPool.pop();
                script.onload = load;
                
               if (document.head) document.head.appendChild(script);
             else document.documentElement.appendChild(script);
        }
    }

    load();
}

KellyTools.replaceAll = function(text, search, replace) {
    
    return text.replace(new RegExp(search, 'g'), replace);
}

// KellyTools.getSha256Hash('CyQxBnFTxmU').then(function(hash) {console.log(digestHex);});
// from firefox examples
  
KellyTools.getSha256Hash = async function(message) {
    
    const msgUint8 = new TextEncoder().encode(message);                           // encode as (utf-8) Uint8Array
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);           // hash the message
    const hashArray = Array.from(new Uint8Array(hashBuffer));                     // convert buffer to byte array
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); // convert bytes to hex string
    
    return hashHex;
}

// 01:12

KellyTools.getTime = function(currentTime) {
    
    currentTime = currentTime ? currentTime : new Date();
    var hours = currentTime.getHours();
    var minutes = currentTime.getMinutes();
    
    if (minutes < 10){
        minutes = "0" + minutes;
    }
    return hours + ":" + minutes;
}

// trim and basic validation of input string

KellyTools.val = function(value, type) {
    
    if (!value) value = '';    
    
    if (typeof value != 'string' && typeof String != 'undefined') {
        value = String(value);
    }
    
    value = value.trim();
    
    if (!type) type = 'string';
    
    if (type == 'string') {
        
        if (!value) return '';
        return value.substring(0, 255);
        
    } else if (type == 'int') {
        
        if (!value) return 0;
        
        value = parseInt(value);
        if (!value) value = 0;
        
        return value;
        
    } else if (type == 'float') {
        
        return KellyTools.validateFloatString(value);
        
    } else if (type == 'bool') {
        
        return value ? true : false;
        
    } else if (type == 'html') {
        
        var parser = new DOMParser();
        var dom = parser.parseFromString(value, 'text/html');
            
        return dom.getElementsByTagName('body')[0];
        
    } else if (type == 'longtext') {
        
        if (!value) return '';
        return value.substring(0, 65400);
    }
}

// html must be completed and valid. For example - input : <table><tr><td></td></tr></table> - ok,  input : <td></td><td></td> - will add nothing 

KellyTools.setHTMLData = function(el, val) {
    
    if (!el) return;
    el.innerHTML = '';
    
    if (val) {
        var valBody = KellyTools.val(val, 'html');
       
        if (valBody && valBody.childNodes) { 
            while (valBody.childNodes.length > 0) {
                el.appendChild(valBody.childNodes[0]);
            }
        }
    }
    
    return el;
}

KellyTools.updateCss = function(id, css) {
      
    var style = document.getElementById(id), head = document.head || document.getElementsByTagName('head')[0];
    if (!style) {
        style = document.createElement('style');
        style.type = 'text/css';
        style.id = id;       
        head.appendChild(style);
    }    
    
    if (style.styleSheet){
        style.styleSheet.cssText = css;
    } else {
        style.innerHTML = '';
        style.appendChild(document.createTextNode(css));
    }
}
 
KellyTools.validateFloatString = function(val) {

    if (!val) return 0.0;
    
    val = val.trim();
    val = val.replace(',', '.');
    val = parseFloat(val);
    
    if (!val) return 0.0;
    
    return val;    
}

KellyTools.downloadTextFile = function(name, txt) {
    
    var link = document.createElement("A");                
        link.style.display = 'none';
        link.onclick = function() {       
            var url = window.URL.createObjectURL(new Blob([txt], {type : 'text/plain'}));                            
            this.href = url; this.download = name + '_' + KellyTools.getBrowser().runtime.getManifest().version.replace(/[^0-9]/g,'') + '.txt';
            
            setTimeout(function() { window.URL.revokeObjectURL(url); link.parentElement.removeChild(link); }, 4000);            
        }
        
    document.body.appendChild(link);    
    link.click();
    return false;
}

KellyTools.getBrowser = function() {
    
    // chrome - Opera \ Chrome, browser - Firefox
    
    if (typeof browser !== 'undefined' && typeof browser.runtime !== 'undefined') {
        return browser;
    }  else if (typeof chrome !== 'undefined' && typeof chrome.runtime !== 'undefined') { // Edge has this object, but runtime is undefined
        return chrome;
    }  else {
        console.log('browser not suppot runtime API method');
        return false;
    }
}

/*
    errorLevel
    
    KellyTools.E_NOTICE = 1 - notice, notrace
    KellyTools.E_ERROR  = 2 - error, trace, default
*/

KellyTools.log = function(info, module, errorLevel) {
    
    var str = '';
    if (!module) module = 'Kelly';  
    if (!errorLevel) errorLevel = KellyTools.E_NOTICE;
    
    if (typeof info == 'object' || typeof info == 'function') {
        str = '[' + KellyTools.getTime() + '] ' + module + ' :  var output :' + "\n\r" + JSON.stringify(info) + "\n\r";
    } else {
        str = '[' + KellyTools.getTime() + '] ' + module + ' : '+ info + "\n\r";
    }
    
    KellyTools.logBuffer += str;
    
    if (errorLevel < KellyTools.E_ERROR) {
        if (this.DEBUG) console.log(str);
    } 
    
    if (errorLevel >= KellyTools.E_ERROR && console.trace) console.trace();
}