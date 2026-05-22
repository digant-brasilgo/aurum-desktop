const bcrypt = require('bcryptjs');

const ROLES = {
  admin: {
    label: 'Administrator',
    color: '#c8a850',
    canDo: ['all'],
    canCreateRoles: ['admin','co','production_manager','data_manager','metal_issuer','stone_issuer'],
  },
  co: {
    label: 'Central Office',
    color: '#4a9eda',
    canDo: ['all'],
    canCreateRoles: ['production_manager','data_manager','metal_issuer','stone_issuer'],
  },
  production_manager: {
    label: 'Production Manager',
    color: '#4db88a',
    canDo: [
      'view_dashboard','view_bags','view_movement','view_groups',
      'view_karigars','view_stones','view_pure_metal','view_machine_dust',
      'view_metal_ledger','view_reports','view_customers',
      'edit_bags','edit_movement','edit_stones',
      'create_bags','create_designs','create_karigars',
    ],
    canCreateRoles: [],  // cannot create system users
    noEdit: true,
  },
  data_manager: {
    label: 'Data Manager',
    color: '#a070d0',
    canDo: [
      'view_dashboard','view_bags','view_movement','view_groups',
      'view_karigars','view_stones','view_pure_metal','view_machine_dust',
      'view_metal_ledger','view_reports','view_customers',
      'edit_bags','edit_movement','edit_stones',
      'create_bags','create_designs','create_karigars',
    ],
    canCreateRoles: [],  // cannot create system users
    noEdit: true,
  },
  metal_issuer: {
    label: 'Metal Issuer',
    color: '#e0903a',
    canDo: ['view_dashboard'],
    canCreateRoles: [],
    noEdit: true,
  },
  stone_issuer: {
    label: 'Stone Issuer',
    color: '#7090c0',
    canDo: ['view_dashboard'],
    canCreateRoles: [],
    noEdit: true,
  },
};

function can(role, permission) {
  const r = ROLES[role];
  if (!r) return false;
  if (r.canDo.includes('all')) return true;
  return r.canDo.includes(permission);
}

function canCreateRole(creatorRole, targetRole) {
  return (ROLES[creatorRole]?.canCreateRoles || []).includes(targetRole);
}

function canManageUsers(role) {
  return ['admin','co'].includes(role);
}

function isNoEdit(role) {
  return ROLES[role]?.noEdit === true;
}

function login(users, username, password) {
  const user = users.find(u =>
    u.username === username.trim().toLowerCase() && u.isActive
  );
  if (!user) return { success: false, error: 'Invalid username or password' };
  if (!bcrypt.compareSync(password, user.password))
    return { success: false, error: 'Invalid username or password' };

  user.lastLogin = new Date().toISOString();
  const role = ROLES[user.role] || ROLES.data_manager;
  return {
    success: true,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      roleLabel: role.label,
      roleColor: role.color,
      permissions: role.canDo,
      canCreateRoles: role.canCreateRoles,
      noEdit: role.noEdit || false,
      canManageUsers: canManageUsers(user.role),
    }
  };
}

function hashPassword(pw)       { return bcrypt.hashSync(pw, 10); }
function checkPassword(pw, hash){ return bcrypt.compareSync(pw, hash); }

function createDefaultAdmin(users) {
  if (users.find(u => u.username === 'admin')) return users;
  users.push({
    id: 'admin-001',
    username: 'admin',
    password: hashPassword('admin123'),
    displayName: 'Administrator',
    role: 'admin',
    isActive: true,
    createdAt: new Date().toISOString(),
    lastLogin: null,
  });
  console.log('Default admin created: admin / admin123');
  return users;
}

module.exports = {
  ROLES, can, canCreateRole, canManageUsers, isNoEdit,
  login, hashPassword, checkPassword, createDefaultAdmin,
};
