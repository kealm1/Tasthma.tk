<?php
/**
 *
 *this script is run to connect to cloud database
 *
 * change the hostname, username, pwd , dbname accordingly to connect to your own database
 */
error_reporting(0);

$host = '35.189.15.221';
$username = 'tasthma';
$pwd = 'tasthma';
$dbName = 'tasthmausers';
$db = new mysqli($host,$username,$pwd,$dbName);
if ($db->connect_errno) {
    die('Sorry, there was an error connecting to the database');
}