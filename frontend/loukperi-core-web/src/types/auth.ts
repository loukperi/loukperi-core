export type AuthWorkspace = {
  id?: string;
  name?: string;
  slug?: string;
};

export type AuthUser = {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
  workspace?: AuthWorkspace;
  permissions?: string[];
};

export type AuthMeResponse = {
  data?: AuthUser;
  id?: string;
  email?: string;
  name?: string;
  role?: string;
  workspace?: AuthWorkspace;
  permissions?: string[];
};