package com.saloonx.saloonx.security;

import com.saloonx.saloonx.model.User;

public interface SalonAuthenticatedUser {
    User getAppUser();
}
