function toggleFeed()
{
    return preventSET(
        _toggleShutter('feedContainer', resizeFeed)
        .then(vNavigate)
    );
}

///
/// resize functions
///

/**
 * 
 * @returns 
 */
function resizeFeed()
{
    return _resizeShutter(
        'feedContainer', 
        document.getElementById("showFeed").checked
    );
}

function generateFreshUploads()
{
    let data = _appDataFeeds.feedUploads()
    let target = document.querySelector('#feedContainer .feedWrapper');

    //for each interval
    Object.keys(data).forEach(
        function (interval) {
        
            //prepare
            let section = document.createElement('section');
            let table = document.createElement('table');
            table.classList.add('sortable');
            let title = document.createElement('h1');
            title.innerHTML = interval;
            let columns = ['Year', 'Genre', 'Artist', 'Album'];

            //head
            let tHead = document.createElement('thead');
            let headerRow = document.createElement('tr');
            columns.forEach(
                function (head) {
                    let thElem = document.createElement('th');
                    thElem.innerHTML = i18n[head.toLowerCase()] || head;
                    headerRow.appendChild(thElem);
                }
            );
            tHead.appendChild(headerRow);
            table.appendChild(tHead);

            // body / albums
            let tBody = document.createElement('tbody');
            data[interval].forEach(
                function (album) {

                    let albumElem = document.createElement('tr');
            
                    columns.forEach(
                        function (columnName) {
                            let cellVal = album[columnName];
                            let cellElem = document.createElement('td');
                            let calculatedFilter = genFilterFromFeed(album, columnName);
                
                            cellElem.innerHTML = cellVal;
                            if (calculatedFilter) {
                                cellElem.dataset.nFilter = calculatedFilter;
                                cellElem.onmousedown = updateFilter;
                                albumElem.setAttribute('title', i18n['access']);
                            }
                
                            albumElem.appendChild(cellElem);
                        }
                    );
            
                    tBody.appendChild(albumElem);

                }
            );
            table.appendChild(tBody);

            section.appendChild(title);
            section.appendChild(table);

            sorttable.makeSortable(table);
            target.appendChild(section);
        }
    );
}

function genFilterFromFeed(data, index)
{
    let newfilter = {};
    
    if (index == "Genre") {
        newfilter['genreUI'] = data["Genre"];
        newfilter['artistUI'] = null;
        newfilter['albumUI'] = null;
    } else if (index == "Artist") {
        newfilter['genreUI'] = data["Genre"];
        newfilter['artistUI'] = data["Artist"];
        newfilter['albumUI'] = null;
    } else if (index == "Album") {
        newfilter['genreUI'] = data["Genre"];
        newfilter['artistUI'] = data["Artist"];
        newfilter['albumUI'] = data["Album"];
    }

    return Object.keys(newfilter).length ? JSON.stringify(newfilter) : null;
}