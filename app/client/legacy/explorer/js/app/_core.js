///
/// STARTUP
///
window.addEventListener(
    "load", function () {
        waitTransitionEnd(
            document.getElementById("loader-container"), function (elem) {
                elem.style.opacity = 1;
            }
        ).then(initializateApp); 
    }
);

function initializateApp()
{
    
    //instantiation
    navigatorSpecificParameterization();
    alignConnectSideElements();
    bindResizeFunctions();
    registerXNavigateSwipeEvents();
    generateSortButtons();
    _rLoader = new RLoader("xmlRLoader", initialRLoaderUrl);

    //download user file
    requestUserUnifiedMusicLibrary();
}

//download library
function requestUserUnifiedMusicLibrary()
{
    let request = new XMLHttpRequest(); 
    request.onprogress = updateProgress;
    request.onloadend = function (e) {
        if (e.currentTarget.status == 200) {
            processUnifiedMusicLibrary(e.currentTarget.responseText);
        }
    };
    request.open('GET', clientURLUnified, true);
    request.send(null);
}

//process...
function processUnifiedMusicLibrary(unifiedAsJSONText)
{
    
    unified = JSON.parse(unifiedAsJSONText); //parse
    _appDataFeeds = generateDataFeeds(unified); //bind lib to data functions

    //prepare UI
    prepareFilterUIs(Object.keys(_discoverFilter));

    //instantiate initial filterUI
    updateFilterUIs(['genreUI']);
    
    //generate feed
    generateFreshUploads(); 
    
    //finally, display the app to the user
    displayApp().then(() => setupLiveUpdatesForShouts());
}