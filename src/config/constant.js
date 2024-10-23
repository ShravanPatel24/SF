module.exports = {
    SUCCESSFUL: 200,
    BAD_REQUEST: 400,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
    TOO_MANY_REQUESTS: 429,
    BAD_GATEWAY: 502,
    GATEWAY_TIMEOUT: 504,
    METHOD_NOT_ALLOWED: 405,
    NOT_ACCEPTABLE: 406,
    UNAUTHORIZED: 401,
    LIMIT_EXCEEDED: 201,
    CREATED_CODE: 201,

    LIMIT_EXCEEDED_MSG: 'Limit exceeded.',
    INTERNAL_SERVER_ERROR_MSG: 'An internal server error has occurred',
    EMAIL_VERIFICATION_REQUIRED_MSG: 'Your email address is not verified. Please verify your email to access full features.',
    MOB_VERIFICATION_REQUIRED_MSG: 'Your phone number is not verified. Please verify your phone number to access full features.',
    FILE_UPLOAD: 'File uploaded successfully.',
    FILE_DELETE: 'File deleted successfully.',
    PROFILE_PHOTO: 'Profile picture uploaded successfully.',
    CONTACT_US_MSG: 'Your message has been sent successfully. We will contact you very soon!',
    DASHBOARD: 'Dashboard',
    USER_ALREADY_VERIFIED: 'Your account has already been verified. Please log in.',
    NO_TOKEN: 'Please provide authentication token.',
    PERMISSION_DENIED: `You don't have permission for this action.`,
    INVALID_MSG: 'Invalid credentials. Please use correct API key and API key secret.',
    UNAUTHORIZED_MSG: 'Please use correct email/phone number and password combination.',
    OLD_PASSWORD_MSG: 'Please enter a valid current password.',
    LOGIN_MSG: 'Logged in successfully!',
    LOGOUT_MSG: 'Logged out successfully!',
    NOT_FOUND_MSG: 'Not found.',
    PARTNER_NOT_FOUND_MSG: 'Partner not found or not a valid partner.',
    FORGOT_PASSWORD: 'An OTP has been sent to your registered email/mobile number.',
    CHANGE_PASSWORD: 'Password changed successfully.',
    INVALID_REQUEST: 'You are not authorized for this request',
    PASSWORD_RESET_FAIL: "Password reset failed",
    EMAIL_VERIFICATION_LINK_EXPIRED: "Your email verification link has expired. Please click the button below to resend the verification link",
    NON_REGISTERED_EMAIL_CHECK: "The mobile number/email is not registered. Please check and try again, or sign up",
    SAME_PASSWORD_ERROR_MSG: "Your new password cannot be the same as your previous password. Please choose a different password.",
    BUSINESS_NOT_FOUND: "Business details not found.",
    BUSINESS_AND_PARTNER_NAME_DUPLICATION: "Business name cannot be the same as the partner\'s name.",
    INVALID_BUSINESS_TYPE: "Invalid business type provided.",
    BUSINESS_TYPE_REQUIRED: "Business type is required for partners.",
    SOCIAL_MEDIA_LINKS_CAPACITY: "You can add up to 5 social media links only.",
    S3_BUCKET_UPLOAD_FAILED: "Failed to upload profile photo to S3.",

    ACCOUNT_DEACTIVATE: 'Your account appears to be deactivated.',
    ACCOUNT_DELETE: 'Your profile is deleted from admin panel kindly mail us at info@omnisttechhub.com or call us at 7417773034.',
    USER_NOT_FOUND: 'User details not found.',
    USER_LIST: 'User list retrieved successfully.',
    USER_DETAILS: 'User details retrieved successfully.',
    USER_STATUS_INACTIVE: 'User status set to inactive successfully.',
    USER_STATUS_ACTIVE: 'User status set to active successfully.',
    USER_NAME_ALREADY_EXISTS: 'The username already exists. Please use different name.',
    USER_EMAIL_ALREADY_EXISTS: 'The email already exists. Please use different email.',
    USER_PHONE_ALREADY_EXISTS: 'The mobile number already exists. Please use different mobile number.',
    USER_UPDATE: 'User information has been updated successfully.',
    USER_CREATE: `Registration successful! We have sent a one time password to your email & phone. Please check your inbox and spam folder. If you haven't received the email, please click the 'Resend' button below.`,
    USER_EMAIL_VERIFY: 'Email verification link sent successfully to your email address',
    USER_EMAIL_VERIFY_MSG: 'Your email has been successfully verified. Thank you for verifying your email. You can now access all the features of our website.',
    USER_EMAIL_VERIFY_FAIL: 'An error occurred while verifying your email. Please try again later or contact support for assistance.',
    USER_PHONE_VERIFY_FAIL: 'An error occurred while verifying your phone. Please try again later or contact support for assistance.',
    USER_RESEND_VERIFICATION_LINK: `A new verification link has been sent to your email address. Please check your inbox and follow the instructions to verify your email. Please check your email inbox for the verification link. If you don't see it in your inbox, please also check your spam or promotions folder.`,
    USER_BLOCKED_FOR_5_WRONG: 'For security reasons your account has been blocked due to repeated entry of incorrect details. Please try again after 5 minutes',
    USER_BLOCKED_FOR_24_WRONG: 'For security reasons your account has been blocked due to repeated entry of incorrect details. Please try again after 24 hours',
    USER_INVALID_EMAIL_PHONE: 'Must provide a valid email or phone number.',
    USER_ID_AND_EMAIL_REQUIRED: 'User ID and email are required.',
    USER_ID_AND_PHONE_REQUIRED: 'User ID and phone are required.',
    USER_PHONE_UPDATE: 'Phone number updated. OTP sent to the new phone number for verification..',
    USER_EMAIL_UPDATE: 'Email number updated. OTP sent to the new email for verification..',
    USER_EMAIL_SAME_AS_CURRENT: "The new email address cannot be the same as the current one.",
    USER_PHONE_SAME_AS_CURRENT: "The new phone cannot be the same as the current one.",
    PROFILE_IMAGE_NOT_FOUND: 'Profile image not found',
    PROFILE_IMAGE_DELETED: 'Profile image deleted successfully',

    RESEND_OTP_FOR_5: `You've exceeded the maximum allowed attempts. For security reasons, your account has been blocked. Please try again after 5 minutes`,
    RESEND_BLOCK_FOR_24_HOURS: `You've exceeded the maximum allowed resend attempts. For security reasons, your resend requests are temporarily blocked. Please try again after 24 hours`,
    OTP_RESEND: 'OTP resend successfully',
    OTP_VERIFIED: 'OTP verified successfully',
    OTP_NOT_VERIFIED: 'OTP is not verified, Please verify OTP to reset password.',
    PASSWORD_RESET_OTP_VERIFIED: 'Password reset OTP verified successfully',
    PASSWORD_RESET_OTP_NOT_VERIFIED: 'Password reset OTP is not verified',
    OTP_STRING_VERIFICATION: 'OTP must be a number',
    INVALID_OTP: "Invalid OTP",
    EXPIRE_OTP: "OTP has expired",

    ADMIN_STAFF_LIST: 'Staff List',
    ADMIN_NOT_FOUND: 'Admin Not found',
    ADMIN_STAFF_DETAILS: 'Staff details',
    ADMIN_STAFF_STATUS_DELETE: 'Staff member deleted successfully',
    ADMIN_STAFF_STATUS_INACTIVE: 'The status of the staff is inactive successfully',
    ADMIN_STAFF_STATUS_ACTIVE: 'The status of the staff is active successfully',
    ADMIN_STAFF_NAME_ALREADY_EXISTS: 'The name already exists. Please use a different name',
    ADMIN_STAFF_EMAIL_ALREADY_EXISTS: 'The email already exists. Please use a different email',
    ADMIN_STAFF_MOBILE_ALREADY_EXISTS: 'The mobile number already exists. Please use a different mobile number',
    ADMIN_STAFF_UPDATE: 'Information has been successfully updated',
    ADMIN_STAFF_CREATE: 'Information has been successfully created',
    ADMIN_USER_EMAIL_PHONE_REQUIRED: "Email/Phone and type are required",

    FAQ_LIST: 'FAQ list loaded successfully',
    FAQ_CREATE: 'FAQ created successfully',
    FAQ_QUESTION_ALREADY_EXISTS: 'The FAQ question already exists.',
    FAQ_DELETE: 'FAQ deleted successfully',
    FAQ_UPDATE: 'FAQ updated successfully',
    FAQ_NOT_FOUND: 'FAQ details not found',
    FAQ_DETAILS: 'Details retrieved successfully',

    BLOG_LIST: 'Blog list loaded successfully',
    BLOG_CREATE: 'Blog created successfully',
    BLOG_TITLE_ALREADY_EXISTS: 'The blog title already exists.',
    BLOG_DELETE: 'Blog deleted successfully',
    BLOG_UPDATE: 'Blog updated successfully',
    BLOG_NOT_FOUND: 'Blog details not found',
    BLOG_DETAILS: 'Details retrieved successfully',

    CONTACT_LIST: 'Contact list loaded successfully',
    CONTACT_CREATE: 'Your request has been received. We will connect with you shortly.',
    CONTACT_DELETE: 'Contact deleted successfully',
    CONTACT_UPDATE: 'Contact updated successfully',
    CONTACT_NOT_FOUND: 'Contact details not found',
    CONTACT_DETAILS: 'Details retrieved successfully',

    NO_SUBSCRIPTION: "Subscription not found",
    CANCEL_SUBSCRIPTION: "Subscription canceled successfully",
    BUY_SUBSCRIPTION: "Subscription bought successfully",
    SUBSCRIPTION_LIST: "Subscription list retrieved successfully",

    SERVICE_CREATED: "Service created successfully",
    SERVICE_LIST: "Service list retrieved successfully",
    SERVICE_UPDATE: "Service updated successfully",
    SERVICE_NOT_FOUND: "Service not found",
    SERVICE_DELETED: "Service deleted successfully",

    DELETED: 'Successfully deleted.',
    UPDATED: 'Successfully updated.',
    ALREADY_EXISTS: 'Already exists.',
    CREATED: 'Successfully created.',
    LIST: 'List retrieved successfully.',
    DETAILS: 'Details retrieved successfully.',
    STATUS: 'Status updated successfully.',
    NOTFOUNT: 'Details not amount successfully.',

    // Roles
    ROLE_CREATE: "Role created successfully.",
    ROLE_UPDATED: "Role updated successfully.",
    ROLE_DELETED: "Role deleted successfully.",
    ROLE_CREATION_FAILED: "Failed to create role.",
    ROLE_NOT_FOUND: "Role not found.",
    ROLE_LIST: "Role list retreived sucessfully.",
    ROLE_DETAILS: "Role details.",

    // Business Type
    BUSINESS_TYPE_NOT_FOUND_MSG: "Business Type Not Found",

    // FOLLOW-UNFOLLOW USER
    FOLLOW_YOURSELF: 'You cannot follow yourself.',
    FOLLOW_PARTNER_ERROR: 'You cannot follow a partner.',
    ALREADY_FOLLOWING: 'You are already following this user.',
    FOLLOWED_SUCCESS: 'Followed successfully.',
    UNFOLLOWED_SUCCESS: 'Unfollowed successfully.',
    NOT_FOLLOWING_USER: 'You are not following this user.',
    FOLLOW_REQUEST_SENT: 'Follow request sent.',
    ALREADY_REQUESTED: 'You have already sent a follow request.',
    FOLLOW_REQUEST_APPROVED: 'Follow request approved and user followed.',
    FOLLOW_REQUEST_REJECTED: 'Follow request rejected.',
    FOLLOW_ERROR: 'Follow request not found or already processed.',

    // POSTS
    ALREADY_LIKED_POST: "User already liked this post.",
    NOT_LIKED_POST: "User has not liked this post.",
    LIKE_SUCCESS: "Post liked successfully.",
    UNLIKE_SUCCESS: "Post unliked successfully.",
    COMMENT_SUCCESS: "Comment added successfully.",
    COMMENT_DELETED: "Comment deleted successfully.",
    COMMENT_TEXT_REQUIRED: "Comment text is required.",
    IMAGE_REQUIRED: "Images are required for this post type.",
    VIDEO_REQUIRED: "Video is required for this post type.",

    // ITEMS
    ITEM_CREATED: 'Item created successfully.',
    ITEM_UPDATED: 'Item updated successfully.',
    OPERATING_DETAIL_UPDATED: 'Operating details updated successfully.',

    // Dine Out
    DINEOUT_REQUEST_ACCEPTED: 'Dine-out request accepted.',
    DINEOUT_REQUEST_REJECTED: 'Dine-out request rejected.',
    DINEOUT_REQUEST_SENT: 'Dine-out request sent successfully.',
    DINEOUT_NOT_FOUND: 'Dine-out request not found.',
    REJECT_AFTER_ACCEPTED: 'You cannot change the status to Rejected after it has been Accepted.',
    BUSINESS_NOT_ASSOCOATED_WITH_PARTNER: 'Selected business is not associated with the specified partner.',
    DINEOUT_DISABLED: 'The selected business does not have dine-out functionality enabled.',

    // CART
    ITEM_NOT_FOUND: 'Item not found in cart.',
    CART_NOT_FOUND: 'Cart not found.',
    CART_EMPTY_MSG: 'Cart is empty.',
    INVALID_PRICE: 'Invalid price for the item.',
    QUANTITY_GREATER: 'Quantity must be greater than 0.',
    ADDED_TO_CART: 'Item added to cart successfully.',
    REMOVED_FROM_CART: 'Item removed from cart.',
    CART_UPDATED: 'Cart item updated.',
    CART_CLEARED: 'Cart cleared successfully.',
    CART_EMPTY: 'Cart is empty.',
    VARIANT_NOT_FOUND: 'The selected size and color combination is not available for this product.',
    INVALID_QUANTITY: 'Quantity must be greater than zero.',
    INVALID_ITEM_TYPE: "Invalid item type.",
    INVALID_PRICE: "Invalid price for item.",
    INVALID_ITEM_ID: 'The provided item ID is invalid.',
    CHECKIN_CHECKOUT_REQUIRED: 'Check-in and check-out dates are required for room booking.',
    INVALID_DATES: 'Invalid check-in or check-out dates.',

    // ORDER
    PAYMENT_SUCCESS_ONLINE_HOTEL_MSG: "Payment successful. Your hotel reservation has been successfully made.",
    PAYMENT_SUCCESS_ONLINE_ORDER_MSG: "Payment successful. Your order has been placed.",
    HOTEL_BOOKED_MSG: "Your hotel reservation has been successfully made.",
    ORDER_PLACED_MSG: "Your order has been placed.",
    ORDER_NOT_FOUND: 'Order not found.',
    ORDER_STATUS_UPDATE: 'Order status updated successfully.',
    CANCEL_AFTER_DELIVERED_ERROR: 'Cannot cancel an order that has already been delivered.',
    ORDER_CANCELLED: 'Order Cancelled Succesfully.',
    UPDATE_STATUS_AFTER_DELIVERD_ERROR: 'Cannot update status of an order that has already been delivered or cancelled.',
};