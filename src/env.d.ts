/// <reference types="astro/client" />

interface UserProfile {
  is_admin: boolean;
  permissions: string[];
}

declare namespace App {
  interface Locals {
    userProfile?: UserProfile;
  }
}
