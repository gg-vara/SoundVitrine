<?php

/**
 * generic cleaning of POST fields, if any
 */
function sanitizePOST()
{
    if (array_key_exists('username', $_POST)) {
        $_POST['username'] = trim(strtolower($_POST['username']));
    }
}

function getFileUploadLimit()
{
    $max_upload = (int)(ini_get('upload_max_filesize'));
    $max_post = (int)(ini_get('post_max_size'));
    $memory_limit = (int)(ini_get('memory_limit'));
    return min($max_upload, $max_post, $memory_limit) * 1000;
}

function isUselessUpload($targetPath, $expectedFilename)
{
    //check for duplicate in current / uploaded file
    if (!file_exists($targetPath)) {
        return false;
    }
    $hash_uploaded = hash_file('sha1', $_FILES[$expectedFilename]['tmp_name']);
    $hash_current = hash_file('sha1', $targetPath);
    return $hash_uploaded == $hash_current ? true : false;
}

function testUploadedFile($expectedFilename)
{
    $fileToUpload = isset($_FILES[$expectedFilename]) ? $_FILES[$expectedFilename] : null;
    if (empty($fileToUpload)) {
        errorOccured(__("e_upLibMiss"));
    }
    if ($fileToUpload['error'] == 4) {
        errorOccured(__("e_noFUp"));
    }
    if ($fileToUpload['error'] > 0) {
        errorOccured(__("e_upErr"));
    }
}

function uploadFile($pathTo, $expectedFilename)
{
    $uploadResult = move_uploaded_file($_FILES[$expectedFilename]['tmp_name'], $pathTo);
    if (!$uploadResult) {
        errorOccured(__("e_upErr"));
    }
}

/**
 * signature of the buffers compressed by Windows' Compression API
 */
const MSZIP_BUFFER_MAGIC = "\x0A\x51\xE5\xC0";

/**
 * decompresses an uploaded file : MSZIP buffer, as compressed natively on Windows (which has no zlib API),
 * or zlib, gzip and raw deflate data. Returns false if it cannot be decompressed
 */
function decompressUpload(string $data): string|false
{
    if (str_starts_with($data, MSZIP_BUFFER_MAGIC)) {
        return mszipDecode($data);
    }

    return zlib_decode($data);
}

/**
 * MSZIP buffer of Windows' Compression API : a 24 bytes header (magic, then uncompressed size at 8, block size at 16),
 * followed by blocks of [compressed size, u32]["CK"][raw deflate], each one using the previous block's output as dictionary
 */
function mszipDecode(string $data): string|false
{
    $length = strlen($data);
    if ($length < 24) {
        return false;
    }

    $expectedSize = unpack('P', $data, 8)[1];

    $output = '';
    $previous = '';
    $offset = 24;
    while ($offset < $length) {
        if ($offset + 4 > $length) {
            return false;
        }

        $size = unpack('V', $data, $offset)[1];
        $offset += 4;

        if ($size < 2 || $offset + $size > $length || substr($data, $offset, 2) !== 'CK') {
            return false;
        }

        $options = $previous === '' ? [] : ['dictionary' => substr($previous, -32768)];
        $context = inflate_init(ZLIB_ENCODING_RAW, $options);
        $block = $context === false ? false : inflate_add($context, substr($data, $offset + 2, $size - 2), ZLIB_FINISH);
        if ($block === false) {
            return false;
        }

        $output .= $block;
        if (strlen($output) > $expectedSize) {
            return false;
        }

        $previous = $block;
        $offset += $size;
    }

    return strlen($output) === $expectedSize ? $output : false;
}

function prepareAndTestUploadedFileCompliance($expectedFilename)
{
    $decompressed = '';

    // check if compressed
    if ($_FILES[$expectedFilename]['type'] == "application/compressed-mlib") {
        //
        $decompressed = decompressUpload(file_get_contents($_FILES[$expectedFilename]["tmp_name"]));

        //
        file_put_contents($_FILES[$expectedFilename]["tmp_name"], $decompressed);

        //
        $_FILES[$expectedFilename]["name"] = pathinfo($_FILES[$expectedFilename]["name"], PATHINFO_FILENAME) . ".json";
        $_FILES[$expectedFilename]["full_path"] = pathinfo($_FILES[$expectedFilename]["name"], PATHINFO_FILENAME) . ".json";
        $_FILES[$expectedFilename]["type"] = "application/json";
        $_FILES[$expectedFilename]["size"] = strlen($decompressed);
    }

    //
    if (empty($decompressed)) {
        $decompressed = file_get_contents($_FILES[$expectedFilename]['tmp_name']);
    }

    //check if JSON compliant
    json_decode($decompressed);
    if (json_last_error() !== JSON_ERROR_NONE) {
        errorOccured(__("e_ucJSON"));
    }
}
