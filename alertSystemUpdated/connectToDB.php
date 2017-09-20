<?php

error_reporting(0);
$db = new mysqli('35.189.15.221','tasthma','tasthma','tasthmausers');
if ($db->connect_errno) {
    die('Sorry, there was an error connecting to the database');
}