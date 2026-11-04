///
///ENTRYPOINT
///

var _SbLatestVal = "";
function initSearchBand()
{
    let input = document.querySelector("#searchBand input");

    //debouncing
    let _searchBand = debounce(
        function (e) {
            let criteria = e.target.value;
            if (criteria != _SbLatestVal) {
                  _SbLatestVal = criteria;
                  searchBand(criteria);
            }
        }, 350
    );

    input.addEventListener("keyup", _searchBand);
    input.addEventListener("focus", toggleSearchResults);
    input.addEventListener("blur", toggleSearchResults);
    input.addEventListener("keydown", handleKeysSearchBand);
}


//search band through head input
function searchBand(criteria)
{
    let data = _appDataFeeds.searchBand(criteria);
    renderSearchResults(criteria, data);
}

///
///HELPERS UI
///

//toggle search results panel beneath the search input
function toggleSearchResults(event)
{
    let target = document.querySelector("#searchBand .searchResults");

    //skip hiding if switching to results panel
    let loosingFocusToSearchResult = event.type == "blur" && event.relatedTarget && event.relatedTarget.parentElement.classList.contains("searchResults");
    if (loosingFocusToSearchResult) { return;
    }

    event.type == "focus" && event.currentTarget.value ? target.classList.add('show') : target.classList.remove('show');
}


function handleKeysSearchBand(event)
{
    if (event.code != 'ArrowDown') { return;
    }
    event.preventDefault();
    let target = document.querySelector("#searchBand .result:first-child");
    if (target) { target.focus();
    }
}

function handleSelectionSearchResult(event)
{
    let target = document.querySelector("#searchBand .searchResults");
    target.classList.remove('show');
    updateFilter(event);
}

function handleKeysSearchResult(event)
{
    if (event.code == 'Enter') { handleSelectionSearchResult(event);
    }
    if (['ArrowUp', 'ArrowDown'].includes(event.code)) {
        event.preventDefault();
        let target = event.currentTarget;
        if (event.code == 'ArrowUp') {
            if (target.previousSibling) { target.previousSibling.focus();
            } else { document.querySelector("#searchBand input").focus();
            }
        }
        if (event.code == 'ArrowDown' && target.nextSibling) { target.nextSibling.focus();
        }
    }
};


//render
function renderSearchResults(criteria, data)
{
    
    let target = document.querySelector("#searchBand .searchResults");
    let ctnr = document.querySelector("#searchBand .search");

    //purge current results
    while (target.firstChild) {
        target.removeChild(target.firstChild);
    }

    //hide or show
    criteria ? target.classList.add('show') : target.classList.remove('show'); 

    //if results
    if (data) {

        let arr = Object.keys(data);

        //add number of elements found
        ctnr.dataset.ef = arr.length;

        //generate results items
        arr.reduce(
            function (total, current) {
            
                //result container
                let resultDiv = document.createElement('div');
                resultDiv.classList.add('result');
                resultDiv.setAttribute('tabindex', 0);
                resultDiv.setAttribute('title', current);

                resultDiv.onmousedown = handleSelectionSearchResult;
                resultDiv.onkeydown = handleKeysSearchResult;

                //get first genre of artist
                let firstGenre = [];
                data[current]["Genres"].forEach(
                    function (val) {
                        firstGenre.push(val);}
                );
                firstGenre = firstGenre.shift();
            
                //add filter params
                let filterObj = {
                    genreUI : firstGenre,
                    artistUI : current
                };
                resultDiv.dataset.nFilter = JSON.stringify(filterObj);

                //range display 
                let range = data[current].sIndexRange;
                if (range) {
                    let b = current.substring(0, range[0]);
                    let c = current.substring(range[0], range[1]);
                    let a = current.substring(range[1], current.length); 
    
                    //bind to spans
                    let spanElems = [b,c,a].map(
                        function (curr) {
                            let elem = document.createElement('span');
                            elem.innerHTML = curr;
                            return elem;
                        }
                    );
                    spanElems[1].classList.add('f');
                    spanElems.forEach(
                        function (e) {
                            resultDiv.appendChild(e);
                        }
                    );
                } else {
                    let elem = document.createElement('span');
                    elem.innerHTML = current;
                    resultDiv.appendChild(elem);
                }

            
                //add genres
                var genresElem = document.createElement('span');
                genresElem.innerHTML += "&nbsp;&nbsp;&nbsp;(";
                data[current]["Genres"].forEach(
                    function (val) {
                        genresElem.innerHTML += val + ", ";
                    }
                );
                genresElem.innerHTML = genresElem.innerHTML.slice(0, -2);
                genresElem.innerHTML += ")";
                genresElem.classList.add('g');
                resultDiv.appendChild(genresElem);

                //return div
                total.push(resultDiv);
                return total;
            }, []
        )
        .forEach(
            function (item) {
                target.appendChild(item); }
        );

    } else {

        //remove elements found indicator
        ctnr.removeAttribute('data-ef');

        //no results
        let noResultDiv = document.createElement('div');
        noResultDiv.classList.add("nr");
        noResultDiv.innerHTML = i18n['no_found'];
        target.appendChild(noResultDiv);
    }
}

function searchBand_foundRange(displayedName, slugFc, searchIndex)
{
    let begin = searchIndex;
    let slugCurrent = slugify(displayedName, true);
    slugCurrent = slugCurrent.substring(searchIndex);
    searchIndex = 0;
    fcIndex = 0;
    
    for(searchIndex; fcIndex < slugFc.length; searchIndex++) {
        if (slugCurrent[searchIndex] == slugFc[fcIndex]) {
            fcIndex++;
        }
    }

    return [begin, begin + searchIndex];
}