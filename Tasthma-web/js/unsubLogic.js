/*This script is used for processing unsubscription,
* main logic is checking the number first, then pass to server-side script
* for deleting record from database
* */
var ph = document.getElementById("unsubPhone"); //phone number input

ph.addEventListener("input", function (event) { //validate phone number
    if (ph.validity.patternMismatch) {
        ph.setCustomValidity("Oops! Please enter a valid Australian mobile number (04xxxxxxxx).");
    } else {
        ph.setCustomValidity("");
        ph.valid = true;
    }
});

function deleteRecord() { //pass number to php script via ajax post for deleting record
    if (ph.valid) {
        document.getElementById('loadinIcon').style.visibility = 'visible';
        $.ajax({
            url: 'scripts/dbController.php',
            type: 'POST',
            dataType: 'json',
            data: {function: 'delete', postcode: 0000, phoneNumber: ph.value, serviceType: 0}
        }).done(function (res) {
            if (res.code != 0) {
                window.location.href='unsubConfirm.html'
            } else {
                alert((res.msg)); //one common error would be the number user want to unsub is not actually in database
                document.getElementById('loadinIcon').style.visibility = 'hidden';
            };
        }).fail(function () {
            alert('Oops! Something went wrong when deleting your data. Please try again.');
            document.getElementById('loadinIcon').style.visibility = 'hidden';
        });
    }
}