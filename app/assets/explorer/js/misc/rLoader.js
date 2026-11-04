
class RLoader {

    constructor(rLoaderId, defaultPath) {

        this._rLoader = document.getElementById(rLoaderId);

        this._mustDisplayBackButton = false;
        this._previousResponseUrl = null;
        this._currentUrl = defaultPath;

        this._initialLoadPromise = _XMLHttpPromise("GET", this._currentUrl)
            .then(function (xmlr) {
                this._fillWithContent(xmlr.response, true);
            }.bind(this));
    }

    initialAnimation() {
        let firstAnim = this._rLoader.style.opacity === "";

        if (firstAnim) return new Promise(function (resolve) {

            removeNotification(".connect-side.notif");

            document.querySelector("#app-connect .connect-side").classList.add("anima");
            document.getElementById("bg").classList.add("show");
            let cc = document.getElementById("connectContainer");

            let waitAll = [
                waitTransitionEnd(cc, function () {
                    cc.classList.add("anima");
                }),
                this._initialLoadPromise
            ];

            Promise.all(waitAll)
                .then(this._fadeIn.bind(this))
                .then(resolve);

        }.bind(this));

        /* dummy promise */
        return Promise.resolve(null);
    }

    _getButtons() {
        return this._rLoader.querySelectorAll("button[href]");
    }

    _getForm() {
        return this._rLoader.querySelector("form");
    }

    _fadeIn() {

        return waitTransitionEnd(this._rLoader, function () {
            this._rLoader.classList.add("shown");
        }.bind(this)).then(function () {
            this._rLoader.style.overflow = "visible";
        }.bind(this));
    }

    _fadeOut() {
        this._rLoader.style.overflow = "";

        return waitTransitionEnd(this._rLoader, function () {
            this._rLoader.classList.remove("shown");
        }.bind(this));
    }

    _goXMLR(method, url, POSTParams, requestingBackButton) {

        let awaitAll = [
            _XMLHttpPromise(method, url, POSTParams),
            this._fadeOut()
        ];

        return Promise.all(awaitAll).then(function (results) {

            let xmlr = results[0];
            let newRUrl = xmlr.responseURL;

            if (this._currentUrl != newRUrl) {
                this._previousResponseUrl = this._currentUrl;
                this._currentUrl = newRUrl;
                this._mustDisplayBackButton = Boolean(requestingBackButton);
            }

            this._fillWithContent(xmlr.response);

        }.bind(this));

    };

    _injectBackButton() {
        let btn = document.createElement("button");
        btn.innerHTML = "<< " + i18n["back"];
        btn.setAttribute("title", i18n["back"]);
        btn.classList.add("back");
        this._rLoader.appendChild(btn);

        btn.onclick = function (event) {
            event.preventDefault();
            this._goXMLR(
                "GET",
                this._previousResponseUrl
            );
        }.bind(this);
    }

    _fillWithContent(content, preventAnimation) {
        if (content) {
            this._rLoader.innerHTML = content;
            if (this._mustDisplayBackButton) this._injectBackButton();
            this._init();
            this._executeInnerScript();
        }

        if (!preventAnimation) this._fadeIn();

    }

    _executeInnerScript() {
        let arr = this._rLoader.getElementsByTagName('script');
        for (let n = 0; n < arr.length; n++) {
            eval(arr[n].innerHTML);
        }
    }

    _init() {

        //buttons
        let aBtns = this._getButtons();
        if (aBtns.length) aBtns.forEach(function (e) {
            let url = e.getAttribute("href");
            e.onclick = function (event) {
                event.preventDefault();
                this._goXMLR(
                    "GET",
                    url,
                    null,
                    !e.hasAttribute("no-back")
                );
            }.bind(this);
            e.removeAttribute("href");
        }.bind(this));

        //forms
        let aForm = this._getForm();
        if (aForm) aForm.onsubmit = function (event) {
            event.preventDefault();
            this._goXMLR(
                aForm.getAttribute("method"),
                aForm.getAttribute("action"),
                new FormData(aForm)
            );
        }.bind(this);

        this._rLoader.setAttribute("loaded", true);
    }

}

