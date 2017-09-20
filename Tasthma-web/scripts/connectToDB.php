<?php
/**
 * Created by PhpStorm.
 * User: Jean-cauce
 * Date: 8/9/17
 * Time: 5:29 PM
 *
 */
error_reporting(0);
$db = new mysqli('35.189.15.221','tasthma','tasthma','tasthmausers');
if ($db->connect_errno) {
    die('Sorry, there was an error connecting to the database');
}
