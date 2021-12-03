// part of kellyShowRate extension, see kellyShowRate.js for copyrights and description

KellyTools = new Object();

KellyTools.DEBUG = false;
KellyTools.E_NOTICE = 1;
KellyTools.E_ERROR = 2;

KellyTools.getLoc = function(key) {
    return typeof chrome !== 'undefined' ? chrome.i18n.getMessage(key) : browser.i18n.getMessage(key);
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

// Get screen width \ height

KellyTools.getViewport = function() {

    var elem = (document.compatMode === "CSS1Compat") ? 
        document.documentElement :
        document.body;

    var height = elem.clientHeight;
    var width = elem.clientWidth;	
    
    return {
        screenHeight: height,
        screenWidth: width,
    };
}

KellyTools.getScrollTop = function() {

    var scrollTop = (window.pageYOffset || document.documentElement.scrollTop) - (document.documentElement.clientTop || 0);
    return scrollTop;
}

KellyTools.getScrollLeft = function() {

    var scrollLeft = (window.pageXOffset || document.documentElement.scrollLeft) - (document.documentElement.clientLeft || 0);
    return scrollLeft;
}

KellyTools.replaceAll = function(text, search, replace) {
    return text.replace(new RegExp(search, 'g'), replace);
}

KellyTools.removeByTag = function(loadDoc, tag) {

    var els = loadDoc.getElementsByTagName(tag);    
    while (els[0]) els[0].parentNode.removeChild(els[0]);
}

// prevent loading images and media
        
KellyTools.stopMediaLoad = function(loadDoc) {

    var cleared = 0, loadImages = loadDoc.getElementsByTagName('img');
    for (var i = 0; i < loadImages.length; i++) {            
        loadImages[i].setAttribute('data-src', loadImages[i].src); loadImages[i].src = '';
        cleared++;
    }
    
    loadImages = loadDoc.getElementsByTagName('source');
    for (var i = 0; i < loadImages.length; i++) {            
        loadImages[i].setAttribute('data-src', loadImages[i].src); loadImages[i].src = '';
        cleared++;
    }
    
    return cleared;
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

KellyTools.getTime = function() {
    var currentTime = new Date();
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

KellyTools.getElementText = function(el) {
    
    if (el) {
         return el.innerText || el.textContent || '';
    }
    
    return '';
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
}

KellyTools.getChildByTag = function(el, tag) {
    if (!el) return false;
    
    var childNodes = el.getElementsByTagName(tag);
    
    if (!childNodes || !childNodes.length) return false;
    
    return childNodes[0];
}

KellyTools.getElementByTag = function (el, tag) {
    return KellyTools.getChildByTag(el, tag);
}

KellyTools.getParentByTag = function(el, tagName) {
    var parent = el;
    if (!tagName) return false;
    
    tagName = tagName.toLowerCase();
    
    while (parent && parent.tagName.toLowerCase() != tagName) {
        parent = parent.parentElement;
    }  
    
    return parent;
}
 
KellyTools.validateFloatString = function(val) {

    if (!val) return 0.0;
    
    val = val.trim();
    val = val.replace(',', '.');
    val = parseFloat(val);
    
    if (!val) return 0.0;
    
    return val;    
}

KellyTools.getBrowser = function() {
    
    // chrome - Opera \ Chrome, browser - Firefox
    
    if (typeof chrome !== 'undefined' && typeof chrome.runtime !== 'undefined') { // Edge has this object, but runtime is undefined
        return chrome;
    } else if (typeof browser !== 'undefined' && typeof browser.runtime !== 'undefined') {
        return browser;
    } else {
        console.log('browser not suppot runtime API method');
        return false;
    }
}

/*
    errorLevel 
    
    1 - notice, notrace
    2 - error, trace, default
*/

KellyTools.log = function(info, module, errorLevel) {
    
    if (!module) module = 'Kelly';
  
    if (!errorLevel) {
        errorLevel = KellyTools.E_NOTICE;
    }    
     
    if (!this.DEBUG && errorLevel < KellyTools.E_ERROR) {
        return;
    }
    
    if (typeof info == 'object' || typeof info == 'function') {
        console.log('[' + KellyTools.getTime() + '] ' + module + ' :  var output :');
        console.log(info);
    } else {
        console.log('[' + KellyTools.getTime() + '] ' + module + ' : '+ info);
    }
    
    if (errorLevel >= KellyTools.E_ERROR && console.trace) {
        
        console.trace();
    }
}

KellyTools.getParentByClass = function(el, className) {
    var parent = el;
 
    while (parent && !parent.classList.contains(className)) {
        parent = parent.parentElement;
    }  
    
    return parent;
}

KellyTools.getElementByClass = function(parent, className) {
        
    if (parent === false) parent = document.body;
    
    if (typeof parent !== 'object') {
     
        
        console.log('unexpected type - ' + typeof parent);
        console.log(parent);
        return false;
    }
    
    if (!parent) return false;
    
    var childNodes = parent.getElementsByClassName(className);
    
    if (!childNodes || !childNodes.length) return false;
    
    return childNodes[0];
}

KellyTools.parseJSON = function(json) {
    
    var data = false;
    
    if (json) {
        try {
            data = JSON.parse(json);
        } catch (e) {
            data = false;
        }
    }
    
    return data;
}