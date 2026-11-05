////
////DATA FEED
////
function generateDataFeeds(lib)
{  

    return {
        genreUI : getGenreUIDataFeed(lib),
        artistUI : getArtistUIDataFeed(lib),
        albumUI : getAlbumUIDataFeed(lib),
        albumInfos : getAlbumInfosDataFeed(lib),
        searchBand : getSearchBandDataFeed(lib),
        statsAlbums : getStatsAlbumsDataFeed(lib),
        statsArtists : getStatsArtistsDataFeed(lib),
        feedUploads : getLatestUploadsList(lib)
    };
}

//genreUI
function getGenreUIDataFeed(lib)
{
    return function () {
        return addSortingCapabilities(albumsByGenreCount(lib));
    };
}

//artistUI
function getArtistUIDataFeed(lib)
{
    return function () {
        let filterCriteria = _discoverFilter['genreUI'];
        if (!filterCriteria) { return;
        }

        let artistsOfGenre = artistsByGenreList(lib)[filterCriteria];
        let apa = albumsByArtistsList(lib);
        
        //artists array
        let arrAog = [];
        artistsOfGenre.forEach(
            function (val) {
                arrAog.push(val);}
        );
        
        //reduce
        arrAog = arrAog.reduce(
            function (result, current) {
                result[current] = Object.keys(apa[current]['Albums']).length;
                return result;
            }, {}
        );

        return addSortingCapabilities(arrAog);
    };
}

//albumUI
function getAlbumUIDataFeed(lib)
{
    return function () {
        let filterCriteria = _discoverFilter['artistUI'];
        if (!filterCriteria) { return;
        }
    
        let apa = albumsByArtistsList(lib);
        let source = apa[filterCriteria]['Albums'];
        
        source = Object.keys(source).reduce(
            function (result, current) {
                result[current] = source[current]['Year'];
                return result;
            }, {}
        );

        return addSortingCapabilities(source);
    };
}

//albumInfos
function getAlbumInfosDataFeed(lib)
{
    return function () {
        let fArtist = _discoverFilter['artistUI'];
        let fAlbum = _discoverFilter['albumUI'];
        if (!fArtist || !fAlbum) { return;
        }
    
        let obj = albumsByArtistsList(lib)[fArtist]['Albums'][fAlbum];
        obj['Album'] = fAlbum;
        obj['Artist'] = fArtist;
        return obj;
    };
}

function addSortingCapabilities(data)
{

    //add alphanum sorting
    data = Object.keys(data).sort().reduce(
        function (result, current, index) {
            result.push(
                {
                    nFilter :  current,
                    count : data[current],
                    order : index + 1
                }
            );
            return result;
        }, []
    );

    //check params exists and are formated
    let sortParams = _discoverSorter.split(":");
    if (sortParams.length != 2) { return data;
    }

    //apply sorters
    let sortingCat = sortParams[0];
    let order = sortParams[1];

    let sortFunc = order.indexOf("asc") != -1 ? 
    function (a,b) {
        return a[sortingCat] - b[sortingCat];
    } : function (a,b) {
        return b[sortingCat] - a[sortingCat];
    };

    return data.sort(sortFunc);
}


//searchBand
function getSearchBandDataFeed(lib)
{

    let limitResults = 100;

    return function (filterCriteria) {
        if (!filterCriteria) { return;
        }
        
        slugFc = slugify(filterCriteria);
    
        let source = albumsByArtistsList(lib);
        let slugs = slugifiedArtists(lib);
        
        let resultCount = 0;
        let results = slugs.reduce(
            function (total, current) {
            
                //if limit is reached, stop searching
                if (resultCount === limitResults) {
                    return total;
                }

                let bandName = current[1];
                let bandSlug = current[0];
                let searchIndex = bandSlug.indexOf(slugFc);
            
                if (searchIndex > -1) {
                    total[bandName] = {
                        Genres :  source[bandName]["Genres"],
                        sIndexRange : searchBand_foundRange(
                            bandName,
                            slugFc,
                            searchIndex
                        )
                    };
                    resultCount++;
                }
    
                return total;
            }, {}
        );
    
        return Object.keys(results).length ? results : null;
    };
}

//statsAlbums
function getStatsAlbumsDataFeed(lib)
{
    return function () {
        return albumsByGenreCount(lib);
    };
}

//statsArtists
function getStatsArtistsDataFeed(lib)
{
    return function () {
        return artistsByGenreCount(lib);
    };
}

//feedUploads
function getLatestUploadsList(lib)
{
    return function () {
        
        //prepare
        let data = albumsByIdList(lib);
        let toarr = Object.keys(data).map(
            function (id) {
                return [id, data[id]];
            }
        );

        //desc sort
        toarr = toarr.sort(
            function (a,b) {
                let aDate = a[1]['DateAdded'];
                let bDate = b[1]['DateAdded']
                return (bDate < aDate) ? -1 : ((bDate > aDate) ? 1 : 0);
            }
        );

        //limit
        toarr = toarr.slice(0, 100);

        //insert intervals
        let dateNow = new moment();
        toarr = toarr.reduce(
            function (total, curr) {
                let interval = compareDateFromNomHumanized(curr[1]['DateAdded'], dateNow);
            
                if (!total[interval]) { total[interval] = []
                    total[interval].push(curr[1]);
                }

                return total;
            }, {}
        );    

        return toarr;
    };
}


///
/// data processing functions
///

function artistsByGenreList(lib)
{
    return lib['arbgl'];
}

function artistsByGenreCount(lib)
{
    return lib['arbgc'];
}

function albumsByGenreList(lib)
{
    return lib['albgl'];
}

function albumsByGenreCount(lib)
{
    return lib['albgc'];
}

function albumsByArtistsList(lib)
{
    return lib['abal'];
}

function slugifiedArtists(lib)
{
    return lib['slug'];
}

function albumsByIdList(lib)
{
    return lib['glul'];
}

