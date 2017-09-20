var postcode = document.getElementById("postcode");
var phoneNumber = document.getElementById("phone");
var postcodeArea = document.getElementById('pcBox');

var services = {morningCheck:false, areaCheck:false};

var greaterMelb = [3000, 3002, 3003, 3004, 3005, 3006, 3008, 3010, 3011, 3012, 3013, 3015, 3016, 3018, 3019,
    3020, 3021, 3022, 3023, 3024, 3025, 3026, 3027, 3028, 3029, 3030, 3031, 3032, 3033, 3034, 3036, 3037, 3038,
    3039, 3040, 3041, 3042, 3043, 3044, 3045, 3046, 3047, 3048, 3049, 3050, 3051, 3052, 3053, 3054, 3055, 3056,
    3057, 3058, 3059, 3060, 3061, 3062, 3063, 3064, 3065, 3066, 3067, 3068, 3070, 3071, 3072, 3073, 3074, 3075,
    3076, 3078, 3079, 3081, 3082, 3083, 3084, 3085, 3086, 3087, 3088, 3089, 3090, 3091, 3093, 3094, 3095, 3096,
    3097, 3099, 3101, 3102, 3103, 3104, 3105, 3106, 3107, 3108, 3109, 3111, 3113, 3114, 3115, 3116, 3121, 3122,
    3123, 3124, 3125, 3126, 3127, 3128, 3129, 3130, 3131, 3132, 3133, 3134, 3135, 3136, 3137, 3138, 3139, 3140,
    3141, 3142, 3143, 3144, 3145, 3146, 3147, 3148, 3149, 3150, 3151, 3152, 3153, 3154, 3155, 3156, 3158, 3159,
    3160, 3161, 3162, 3163, 3165, 3166, 3167, 3168, 3169, 3170, 3171, 3172, 3173, 3174, 3175, 3177, 3178, 3179,
    3180, 3181, 3182, 3183, 3184, 3185, 3186, 3187, 3188, 3189, 3190, 3191, 3192, 3193, 3194, 3195, 3196, 3197,
    3198, 3199, 3200, 3201, 3202, 3204, 3205, 3206, 3207, 3800];


postcodeArea.style.visibility = 'hidden';

$('input[name=service]').change(function(){
    var val = $(this).val();
    if($(this).is(':checked')) {
        services[val] = true;
        if( val == 'morningCheck') {
            postcodeArea.style.visibility = 'visible';
        }
    } else {
        services[val] = false;
        if(val == 'morningCheck') {
            postcodeArea.style.visibility = 'hidden';
        }
    }
});

postcode.addEventListener("input", function (event) {
    if (!isValidPostcode(postcode.value)) {
        postcode.valid = false;
        postcode.setCustomValidity("Oops! Please type in a valid postcode");
    } else {
        postcode.setCustomValidity("");
        postcode.valid = true;
    }
});

phoneNumber.addEventListener("input", function (event) {
    if (phoneNumber.validity.patternMismatch) {
        phoneNumber.setCustomValidity("Oops! Please type in a valid Oz mobile number (04xxxxxxxx).");
    } else {
        phoneNumber.setCustomValidity("");
        phoneNumber.valid = true;
    }
});

function isValidPostcode(postcode) {
    return greaterMelb.indexOf(parseInt(postcode)) >= 0;
}

function insertData() {
    if(postcodeArea.style.visibility == 'visible') {
        if(postcode.value.trim().length == 0) {
            postcode.valid == false;
            postcode.setCustomValidity("Oops! Please type in postcode in greater Melb");
        }
    } else {
        postcode.valid = true;
    }
    if (!services['morningCheck'] && !services['areaCheck']) {
        alert('Please select at least one service!');
        return;
    }
    if (postcode.valid && phoneNumber.valid) {
        var subType = getServicesType();
        var pCode = 0000;
        if (subType != 2) {
            pCode = postcode.value;
        }
        $.ajax({
            url: 'scripts/dbController.php',
            type: 'POST',
            dataType: 'json',
            data: {function: 'insert', postcode: pCode, phoneNumber: phoneNumber.value, serviceType: subType}
        }).done(function (res) {
            alert((res.msg));
            if (res.code != 0) {
                window.location.href='index.html'
            };
        }).fail(function () {
            alert('add data failed');
        });
    }
}

function getServicesType() {
    if(services.morningCheck && services.areaCheck) {
        return 3;
    } else if(services.areaCheck) {
        return 2;
    } else if (services.morningCheck) {
        return 1;
    } else {
        return 0;
    }
}
