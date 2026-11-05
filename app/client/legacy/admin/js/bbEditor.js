class BBEditor {
    constructor(targetId) {
        this._editor = document.getElementById(targetId);
        if (!this._editor) {
            return;
        }

        this._siblings = getSiblings(this._editor);
        this._picker = this._editor.getElementsByClassName("colorPicker")[0];
        this._pickers = this._picker.querySelectorAll(".colors > *");
        this._pickers.forEach(this._addChangeHandler.bind(this));
        this._background = this._editor.getElementsByClassName("wAnim")[0];

        this._bbStyle = document.createElement("style");
        this._bbStyle.setAttribute("id", "bbStyle");
        document.body.appendChild(this._bbStyle);

        this._validateBtn = this._editor.getElementsByClassName("validate")[0];
        this._validateBtn.addEventListener("click", this.applyColors.bind(this));

        this._cancelBtn = this._editor.getElementsByClassName("cancel")[0];
        this._cancelBtn.addEventListener("click", this.closePicker.bind(this));

        this._currentColors = this._harvestColors();
        this.setColors();

        this._clickHandler = null;
        this._addClickHandler();
    }

    saveColors(colors) {
        this._currentColors = colors;
        // TODO
        _XMLHttpPromise("POST", "/account/bb", JSON.stringify(colors));
    }

    setColors(colors) {

        if (!colors) {
            colors = this._currentColors;
        }

        this._setColorsToPickers(colors);
        this._setColorsToBackground(colors);

    }

    _setColorsToBackground(colors) {
        let owner = this._background.getAttribute("data-owner");
        let joincolors = colors.slice().join(",");
        this._bbStyle.innerHTML = '.wAnim[data-owner="' + owner + '"]::after { background:linear-gradient(-45deg, ' + joincolors + ') !important; }';
    }

    _setColorsToPickers(colors) {
        let norder = colors.slice().reverse();
        this._pickers.forEach(
            function (e, i) {
                e.setAttribute("value", norder[i]);
                e.value = norder[i];
            }
        );
    }

    _getColorsFromPickers() {
        let result = Array.from(this._pickers).map(
            function (e) {
                return e.getAttribute("value");
            }
        );

        return result.reverse();
    }

    _harvestColors() {
        let style = window.getComputedStyle(this._background, "::after");
        let colors = style
            .backgroundImage
            .split(", rgb").slice(1)
            .map(
                function (e) {
                    return "rgb" + e.replace("))", ")");
                }
            )
            .map(RGBToHex);
        return colors;
    }

    _addChangeHandler(subpicker) {
        subpicker.addEventListener(
            "change", function (event) {
                event.target.setAttribute("value", event.target.value);
                this.setColors(
                    this._getColorsFromPickers()
                );
            }.bind(this)
        );
    }

    _addClickHandler() {
        if (!this._clickHandler) {
            this._clickHandler = this.openPicker.bind(this);
        }
        this._editor.addEventListener("click", this._clickHandler);
    }

    _removeClickHandler() {
        this._editor.removeEventListener("click", this._clickHandler);
    }

    applyColors() {
        this.saveColors(
            this._getColorsFromPickers()
        );
        this.closePicker();
    }

    _waitForsiblingsToTransition(func) {
        return this._siblings.map(
            function (e) {
                return waitTransitionEnd(e, func);
            }
        );
    }

    openPicker() {

        this._removeClickHandler();

        let waitAll = this._waitForsiblingsToTransition(
            function (sibling) {
                sibling.style.pointerEvents = "none";
                sibling.style.opacity = 0;
            }
        );

        Promise.all(waitAll).then(
            function () {
                this._editor.classList.add("open");
            }.bind(this)
        );
    }

    closePicker() {

        waitTransitionEnd(
            this._picker, function () {
                this._editor.classList.remove("open");
            }.bind(this)
        ).then(
            function () {

                this.setColors();

                let waitAll = this._waitForsiblingsToTransition(
                    function (sibling) {
                        sibling.style.pointerEvents = "";
                        sibling.style.opacity = "";
                    }
                );

                Promise.all(waitAll).then(
                    function () {

                        this._addClickHandler();

                    }.bind(this)
                );

            }.bind(this)
        );
    }
}