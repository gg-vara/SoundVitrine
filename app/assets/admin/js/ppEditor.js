class PPEditor {
    constructor(targetId) {
        this._editor = document.getElementById(targetId);
        if (!this._editor) {
            return;
        }
        this._picker = this._editor.getElementsByClassName("PPPicker")[0];
        this._imgHolder = this._editor.getElementsByClassName("imgHolder")[0];
        this._imgElem = this._imgHolder.getElementsByTagName("img")[0];
        this._clickHandler = null;

        this._addClickHandler();
        this._picker.addEventListener("change", this.handleNewPic.bind(this));
    }

    openPicker() {
        this._picker.click();
    }

    getPickedFile() {
        return this._picker.files[0];
    }

    handleNewPic() {

        //fill form
        var formData = new FormData();
        let file = this.getPickedFile();
        if (!file) {
            return;
        }
        formData.append('file', file);

        let waitAll = [
            this._uploadPP(formData),
            this._addUploadAnimation()
        ]

        //event ordering
        Promise.all(waitAll).then(
            function (results) {
                let xmlr = results[0];
                this._bindToImg(xmlr);
                this._removeUploadAnimation();
            }.bind(this)
        );

    }

    _addClickHandler() {
        if (!this._clickHandler) {
            this._clickHandler = this.openPicker.bind(this);
        }
        this._editor.addEventListener("click", this._clickHandler);
    }

    _bindToImg(xmlr) {
        this._imgElem.src = xmlr.response;
    }

    _removeClickHandler() {
        this._editor.removeEventListener("click", this._clickHandler);
    }

    _uploadPP(data) {
        // TODO
        return _XMLHttpPromise("POST", "/account/pp", data);
    }

    _addUploadAnimation() {
        this._removeClickHandler();
        return waitTransitionEnd(
            this._imgHolder, function () {
                this._editor.classList.add("uploading");
            }.bind(this)
        );
    }

    _removeUploadAnimation() {
        this._addClickHandler();
        return waitTransitionEnd(
            this._imgHolder, function () {
                this._editor.classList.remove("uploading");
            }.bind(this)
        );
    }
}