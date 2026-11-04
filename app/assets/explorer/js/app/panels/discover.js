///
///ENTRYPOINT
///

//update filter from UI action
function updateFilter(event)
{
    
    //prevent bubbling to .filterUI level event
    event.stopPropagation(); 

    //update FilterUIs by required values
    let newFilters = getNewFiltersFromUI(event);
    let IDsToReload = applyNewFilters(newFilters);
    updateFilterUIs(IDsToReload);

    //dynamically generate albums infos and scrolls to it if necessary
    displayAlbumInfos(_appDataFeeds.albumInfos).then(
        function (albumInfosElem) {
            if (newFilters["albumUI"]) { transitionToAlbumInfos(albumInfosElem);
            }
        }
    );

    //if must reload something, scroll to this last something
    if (!newFilters["albumUI"]) {
        let target = document.querySelector('.filterUI.active:not(.hasSelection)');
        vNavigate(target, -30); //add margin-top for ::before tag element
    }
}


///
///DATA PROCESSING HELPERS
///

//from UI action, format the new filters to apply
function getNewFiltersFromUI(event)
{

    //prepare
    let dataFilters = event.currentTarget.dataset.nFilter;
    let filterUIBound = event.currentTarget.parentNode.parentNode;

    //handle single arg with primitive data, essentially from button click
    if (!IsJsonString(dataFilters) && filterUIBound.classList.contains('filterUI')) {

        //preapre
        let dFilter = dataFilters;
        let filterCat = filterUIBound.id;

        //if dest filter is equal to current, it means that the user wants to remove it
        if (dFilter && _discoverFilter[filterCat] == dFilter) { dFilter = null;
        }

        //update dataFilters obj
        dataFilters = {};
        dataFilters[filterCat] = dFilter;

    } else {
        //parse filter string to Obj
        dataFilters = JSON.parse(dataFilters);
    }

    return dataFilters;
}

//apply filters and return UI IDs that need a reload
function applyNewFilters(newFilters)
{

    let resetFollowing = false;
    return Object.keys(_discoverFilter).reduce(
        function (toGenerate, id, index, initalArray) {

            //prepare
            let newValue = newFilters[id];
            let oldValue = _discoverFilter[id];
            let newValIsUndef = typeof newValue === 'undefined';

            if (oldValue == newValue) { return toGenerate; //if identical, skip
            }
            if (newValIsUndef && !resetFollowing) { return toGenerate; //if no modification already occured before and no new val, skip
            }

            //if previous have been modified, no new values have been specified and the old value is something, force a reset
            if (resetFollowing && newValIsUndef && oldValue) { newValue = null;
            }

            //sets new value
            _discoverFilter[id] = newValue || null;

            //assumes a modification has occured
            resetFollowing = true;

            //add the next existing id to regeneration queue
            let nextId = initalArray[index + 1];
            if (nextId) { toGenerate.push(nextId);
            }
            return toGenerate;
        }, []
    );
}

///
///HELPERS UI
///

//prepare sub elements of the filterUIs
function prepareFilterUIs(IDs)
{
    IDs.forEach(
        function (id) {
            let target = document.getElementById(id);
            target.classList.add("filterUI");

            let ph = document.createElement('span');
            ph.classList.add("ph");
            target.appendChild(ph);

            let list = document.createElement('div');
            list.classList.add("list");
            target.appendChild(list);

            //permit to open the list when something has already been selected on the filter
            target.onmousedown = function (e) {
                target.classList.contains('open') ? target.classList.remove('open') : target.classList.add('open');
            };

        }
    );
}

//helper func
function updateFilterUIs(arrayOfIDs)
{
    arrayOfIDs.forEach(
        function (id) {
            generateFilterUI(id, _appDataFeeds[id]);
        }
    );
    Object.keys(_discoverFilter).forEach(
        function (id) {
            alterFilterUI(id, _discoverFilter[id]);
        }
    );

}

//generate genres UI
function generateFilterUI(id, dataFunc)
{

    let target = document.querySelector('#' + id + ' .list');

    //purge current results
    while (target.firstChild) {
        target.removeChild(target.firstChild);
    }

    if (dataFunc == null) { return false;
    }
    let data = dataFunc();

    //if there is any data
    if (data) {
        data.map(
            function (current) {
                let item = document.createElement('div');
                item.innerHTML = current.nFilter;
                item.dataset.count = current.count;
                item.dataset.order = current.order;
                item.dataset.nFilter = current.nFilter;
                item.onmousedown = updateFilter;
                item.classList.add("mix");
                return item;
            }
        )
        .forEach(
            function (item) {
                target.appendChild(item); }
        );
    }
    
    //define mixer for sorting 
    if (_discoverMixers[id]) { _discoverMixers[id].destroy();
    }
    _discoverMixers[id] = mixitup(
        target, {
            animation: {
                duration: 300
            }
        }
    );

    return true;
}

//alter
function alterFilterUI(id, filterCriteria)
{

    //prepare
    let ui = document.getElementById(id);
    let list = document.querySelectorAll('#' + id + ' .list > *');
    let ph = document.querySelector('#' + id + ' .ph');

    //ui filter greying not selected
    list.forEach(
        function (curr) {
            let nodefilter = curr.dataset.nFilter;
            nodefilter == filterCriteria ? curr.classList.add("selected") : curr.classList.remove("selected");
        }
    );

    //ui filter acordeon effect + placeholder filing
    if (filterCriteria) {
        ui.classList.add("hasSelection");
        ui.classList.remove("open");
        ph.innerHTML = filterCriteria;
    } else {
        ui.classList.remove("hasSelection");
        ph.innerHTML = ""; //resets placeholder
    }

    //ui filter prefix
    list.length || ph.innerHTML ? ui.classList.add("active") : ui.classList.remove("active");

    //apply for animations
    applyManualSizesFilterUIs(id);
}


//animation scroll
function transitionToAlbumInfos(aiElem)
{
    //scroll to albumInfos...
    vNavigate(aiElem, -10);
}

///
/// resize functions
///

function applyManualSizesFilterUIs(id)
{
        
    //prepare
    let list = document.querySelector('#' + id + ' .list');
    let ph = document.querySelector('#' + id + ' .ph');
    if (!list || !ph) { return;
    }

    //reset manual widths for animations
    let mWidthQuery = 'style[data-ct="' + id + '"]';
    let mWidth = document.querySelector(mWidthQuery);
    if (mWidth) { mWidth.parentElement.removeChild(mWidth);
    }

    //calculate ceil + small margin upper
    let ceil = function (val) {
        return (Math.ceil(val * 10) / 10) + 0.1;
    };

    //helper function to calculate heights / widths
    let genCss = function (minOrMax, dimension) {
        let prop = "scroll" + dimension;
        let val = null;
        switch (minOrMax) {
        case "min":
            val = ceil(((ph[prop] || list[prop] + 1) / getRootElementFontSize()));
                return '#' + id + '{' + dimension.toLowerCase() + ' : ' + val + 'rem;}';
        case "max":
            val = ceil(((list[prop] + 1) / getRootElementFontSize()));
                return '#' + id + '.open {' + dimension.toLowerCase() + ' : ' + val + 'rem;}';
        }
    }

    //force relative positionning to get true height / width of list
    list.style.position = "relative"; 

    //set manual widths and heights for animations 
    let styleCarrier = document.createElement('style');
    styleCarrier.dataset.ct = id;
    styleCarrier.innerHTML += genCss("min", "Width");
    styleCarrier.innerHTML += genCss("max", "Width");
    styleCarrier.innerHTML += genCss("min", "Height");
    styleCarrier.innerHTML += genCss("max", "Height");

    list.style.position = null; //unforce

    document.head.appendChild(styleCarrier);
}

/////////////////
/// Sorting... //
/////////////////

function applySort(event)
{
    let thisLbl = event.currentTarget;

    //depending on active...
    if (!thisLbl.classList.contains("active")) {
        
        //remove active from others
        [thisLbl.nextElementSibling, thisLbl.previousElementSibling].forEach(
            function (elem) {
                if (!elem) { return;
                }
                elem.classList.remove("active");
            }
        );

        //pass to this one
        thisLbl.classList.add("active");
    } else {

        //swap direction...
        thisLbl.dataset.direction = thisLbl.dataset.direction == "asc" ? "desc" : "asc"; 

    }

    //replace icon
    alterSortIcon(thisLbl.dataset, thisLbl.firstElementChild);

    //alter sorting
    updateSortingData(thisLbl.dataset);
}

function updateSortingData(dataset)
{
    _discoverSorter = dataset.category + ":" + dataset.direction;
    localStorage.setItem(defFiltStorageKey, _discoverSorter);
    Object.keys(_discoverMixers).forEach(
        function (key) {
            _discoverMixers[key].sort(_discoverSorter);
        }
    );
}

function alterSortIcon(dataset, iconElem)
{
    //generate new icon class
    let iconClass = "fa-sort-" + Object.keys(dataset).map(
        function (val) {
            return _sortersIconAdapter[dataset[val]];
        }
    ).join("-");

    let toReplace = Object.values(iconElem.classList).find(
        function (e) {
            return e != "fas"}
    );
    if (toReplace) {
        iconElem.classList.replace(toReplace, iconClass);
    } else {
        iconElem.classList.add(iconClass);
    }
}

function generateSortButtons()
{

    let sortParam = _discoverSorter.split(":");

    let btnGenerator = function (sorter) {
        let isCurrentSorter = sortParam[0] == sorter;

        //define label
        let lbl = document.createElement("label");
        lbl.setAttribute("title", i18n['sort_'+ sorter]);
        lbl.onclick = applySort;
        lbl.classList.add("clickable");
        if (isCurrentSorter) { lbl.classList.add("active");
        }
        lbl.dataset.category = sorter;
        lbl.dataset.direction = isCurrentSorter ? sortParam[1] : _defaultSorters[sorter];

        //define icon
        let i = document.createElement("i");
        i.classList.add("fas");
        alterSortIcon(lbl.dataset, i);

        //return
        lbl.appendChild(i);
        return lbl;
    };

    //bind buttons to container
    let sorterElem = document.getElementsByClassName("sorter")[0];
    Object.keys(_defaultSorters)
          .map(btnGenerator)
        .forEach(
            function (item) {
                sorterElem.appendChild(item); }
        );
}

//////////////////////////////////
// handle album infos rendering //
//////////////////////////////////

function displayAlbumInfos(dataFunc)
{
    return new Promise(
        function (resolve) {

            let data = dataFunc(); 

            let target = document.getElementById('albumInfos');
        
            let aYear = document.getElementById('aYear');
            let aGenre = document.getElementById('aGenre');
            let aDateAdded = document.getElementById('aDateAdded');
            let aTracks = document.getElementById('aTracks');
            let aTitle = document.getElementById('aTitle');

            //purge
            [aYear, aGenre, aDateAdded, aTracks].forEach(
                function (e) {
                    e.innerHTML = '';
                    e.removeAttribute('title');
                }
            );
    
            //specific image purge
            let aImage = document.getElementById('aImage');
            resetImgLoader(aImage);
    
            //clean link to YT
            let link = document.querySelector('#albumInfos .listen a');
            link.setAttribute('href', null);
            link.setAttribute('target', null);

            let bypass = false;
            if (target.classList.contains("show")) {
                target.classList.remove('show');
                bypass = true;
            }
    
            //then fill
            if (data) {
    
                //specific async image handler
                aImage.classList.add('searchingCover');
                queryMusicBrainzForAlbumCover().then(
                    function (imgUrl) {
                        updateImgLoader(aImage, imgUrl);
                    }, function () {
                        brokenImgFr(aImage);
                    }
                );
    
                aYear.innerHTML = data['Year'];
                aGenre.innerHTML = data['Genre'];
                aTitle.innerHTML = data['Album'];
    
                aDateAdded.innerHTML = compareDateFromNomHumanized(data['DateAdded']);
                aDateAdded.setAttribute('title', data['DateAdded']);
            
                Object.keys(data['Tracks']).forEach(
                    function (trackId) {
                        aTracks.innerHTML += '<li>' + data['Tracks'][trackId] + '</li>';
                    }
                );

                //link to YT
                link.setAttribute('href', linkToYoutube(data['Artist'], data['Album']));
                link.setAttribute('target', "_blank");

                //show, start animation
                let action = function () {
                    target.classList.add('show');};

                //should wait for animation to end
                if (!bypass) {
                    waitTransitionEnd(target, action).then(resolve);
                } else {
                    action();
                    resolve(target);
                }
            }
        }
    );
}
