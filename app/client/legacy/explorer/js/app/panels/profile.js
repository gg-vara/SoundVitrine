function toggleProfile()
{
    preventSET(
        _toggleShutter('profileContainer', resizeProfile)
    );
}

///
/// resize functions
///

function resizeProfile()
{
    return _resizeShutter(
        'profileContainer',
        document.getElementById('showProfile').checked
    );
}