///
///ENTRYPOINT
///

function renderStats()
{
    renderHCPie(_appDataFeeds.statsAlbums(), 'statsAlbums');
    renderHCPie(_appDataFeeds.statsArtists(), 'statsArtists');
}

///
///HELPERS UI
///

//render a single chart
var _hcObjects = {};
function renderHCPie(data, divId)
{

    //format to highcharts specifics
    data = Object.keys(data).map(
        function (genreName) {
            return {
                "name" : genreName,
                "y" : data[genreName]
            };
        }
    );

    var name = document.getElementById(divId).getAttribute('data-def');

    //define chart
    let chart = {
        credits: false,
        chart: {
            type: 'pie',
            backgroundColor: 'rgba(255,255,255,0)',
            plotBackgroundColor: null,
            plotBorderWidth: null,
        },
        title: '',
        tooltip: {
            pointFormat: i18n["statsPointFormat"]
        },
        plotOptions: {
            pie: {
                allowPointSelect: true,
                dataLabels: {
                    enabled: false,
                    format: '<b>{point.name}</b>: {point.y}',
                    style : {
                        textOutline : null
                    }
                }
            }
        },
        series: [{
            name : name,
            data : data
        }]
    };

    //instanciate
    let hc = Highcharts.chart(divId, chart);
    _hcObjects[divId] = hc;
}
  
function switchPanel(event)
{
    let statsContainer = document.getElementById('stats');
    let panelNo = event.currentTarget.dataset.phid;
    let containerHeight = statsContainer.clientHeight 
    statsContainer.scrollTop = containerHeight * panelNo;
}
  
function _reflowCharts(source)
{

    return new Promise(
        function (resolve) {
        
            Object.keys(_hcObjects).forEach(
                function (elemId) {
                    _hcObjects[elemId].reflow(); 
                }
            );

            if (!document.getElementById('stats').style.opacity) {
                document.getElementById('stats').style.opacity = 1;
            }

            resolve(source);
        }
    );
}

function resizeStats()
{
    return _resizeShutter(
        'statsContainer',
        document.getElementById("showStats").checked
    );
}

function toggleStats()
{
    return preventSET(
        _toggleShutter('statsContainer', resizeStats)
        .then(_reflowCharts)
        .then(vNavigate)
    );
}