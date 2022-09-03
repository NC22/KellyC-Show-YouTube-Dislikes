// related to About page

var KellyCAbout = new Object();    
    KellyCAbout.language = 'en';
    
KellyCAbout.showPage = function(cfg) {
    
    var handler = KellyCAbout;
        handler.cfg = cfg;
        
    var url = new URL(window.location.href), mode = url.searchParams.get('mode');
    if (!mode || ['update', 'about'].indexOf(mode) == -1) mode = 'about';
    
    document.body.classList.add('mode-' + mode);
    
    handler.container = document.getElementsByClassName('notice-' + handler.language)[0];
    handler.container.style.display = '';
    
    if (mode == 'update') {        
        handler.container.getElementsByClassName('version')[0] = KellyTools.getBrowser().runtime.getManifest().version;
    }
    
    handler.bgManager = new KellyNradiowaveBg();
    handler.bgManager.init();
}
    
KellyCAbout.init = function() 
{   
    KellyTools.getBrowser().i18n.getAcceptLanguages().then(function(languages) {
        
        console.log(languages);
        
        if (languages.indexOf('ru') != -1) KellyCAbout.language = 'ru';
        
        KellyCAbout.showPage();
    });             
} 