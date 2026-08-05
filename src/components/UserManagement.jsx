import React, { useState, useEffect } from 'react';
import { ModalPortal } from './ModalPortal';
import { ConfirmModal } from './ConfirmModal';
import { Icons } from './Icons';
import api from '../services/api.js';

const ROLE_PREFIX = {
  'Administrator': 'ADM',
  'Manager': 'MGR',
  'Cashier': 'CSH',
  'Inventory Staff': 'INV',
  'Barista': 'BST',
};

const ROLE_TO_DB = {
  'Administrator': 'admin',
  'Manager': 'manager',
  'Inventory Staff': 'stock_clerk',
  'Cashier': 'cashier',
  'Barista': 'barista',
};

const DB_ROLE_TO_LABEL = {
  admin: 'Administrator',
  manager: 'Manager',
  cashier: 'Cashier',
  stock_clerk: 'Inventory Staff',
  barista: 'Barista',
};

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80';

const getLastName = (fullName) => (fullName || '').trim().split(/\s+/).pop() || 'user';
const generatePassword = (fullName) => getLastName(fullName).toLowerCase();
const generatePin = (empCode) => {
  const m = String(empCode || '').match(/(\d+)$/);
  const num = m ? parseInt(m[1], 10) : 0;
  return String(num).padStart(4, '0').slice(-4);
};

export function UserManagement({ employees, can, onAddEmployee, onUpdateEmployee, onDeleteEmployee, onToggleEmployeeStatus }) {
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('All');
  const [selectedStaff, setSelectedStaff] = useState(employees[0] || null);
  const [modalMode, setModalMode] = useState(null); // 'add' | 'edit'
  const [modalOpen, setModalOpen] = useState(false);
  const [previewStaff, setPreviewStaff] = useState(null);
  const [staffDetails, setStaffDetails] = useState(null);
  const [deletingStaff, setDeletingStaff] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingStatus, setEditingStatus] = useState('Active');

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Cashier');
  const [employeeId, setEmployeeId] = useState('');
  const [avatar, setAvatar] = useState(null);

  const generateEmployeeId = (r, list) => {
    const prefix = ROLE_PREFIX[r] || 'STF';
    const next = (list || []).filter(e => e.role === r).length + 1;
    return `${prefix}-${String(next).padStart(3, '0')}`;
  };

  useEffect(() => {
    if (modalOpen && modalMode === 'add') {
      setEmployeeId(generateEmployeeId(role, employees));
    }
  }, [modalOpen, modalMode, role, employees]);

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result);
    reader.readAsDataURL(file);
  };

  const openAdd = () => {
    setModalMode('add');
    setAvatar(null);
    setName('');
    setEmail('');
    setPhone('');
    setRole('Cashier');
    setEmployeeId(generateEmployeeId('Cashier', employees));
    setModalOpen(true);
  };

  const openEdit = (staff) => {
    setModalMode('edit');
    setEditingId(staff.id);
    setEditingStatus(staff.status || 'Active');
    setName(staff.name);
    setEmail(staff.email || '');
    setPhone(staff.phone || '');
    setRole(staff.role);
    setEmployeeId(staff.employeeId || '');
    setAvatar(staff.avatar && String(staff.avatar).startsWith('data:') ? staff.avatar : null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalMode(null);
    setEditingId(null);
  };

  const openPreview = async (staff) => {
    setPreviewStaff(staff);
    setStaffDetails(null);
    try {
      const fresh = await api.getUser(staff.id);
      setStaffDetails(fresh);
    } catch (err) {
      console.warn('API error fetching user details:', err);
    }
  };

  const handleDelete = async (staffId) => {
    try {
      await api.deleteUser(staffId);
    } catch (err) {
      console.warn('API error deleting user:', err);
    }
    onDeleteEmployee(staffId);
    if (selectedStaff?.id === staffId) {
      setSelectedStaff(null);
    }
    if (previewStaff?.id === staffId) {
      setPreviewStaff(null);
      setStaffDetails(null);
    }
    setDeletingStaff(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (modalMode === 'edit') {
      const existing = employees.find(e => e.id === editingId);
      const nextAvatar = avatar || existing?.avatar || DEFAULT_AVATAR;
      try {
        await api.updateUser(editingId, {
          name,
          email,
          role: ROLE_TO_DB[role] || role,
          avatar: nextAvatar,
        });
      } catch (err) {
        console.warn('API error updating user, keeping local change:', err);
      }
      onUpdateEmployee({
        id: editingId,
        name,
        email,
        phone,
        role,
        employeeId,
        status: editingStatus,
        avatar: nextAvatar,
      });
      if (selectedStaff?.id === editingId) {
        setSelectedStaff(prev => ({ ...prev, name, email, phone, role, avatar: nextAvatar }));
      }
      closeModal();
      return;
    }

    const password = generatePassword(name);
    const pin = generatePin(employeeId);

    try {
      const res = await api.createUser({
        name,
        employee_id: employeeId,
        email: email || `${name.toLowerCase().replace(/\s+/g, '')}@coffeeshop.com`,
        role: ROLE_TO_DB[role] || 'cashier',
        password,
        pin,
        avatar: avatar || DEFAULT_AVATAR,
      });
      onAddEmployee({
        id: String(res.id),
        name: res.name,
        email: res.email,
        phone,
        role,
        employeeId,
        status: res.is_active ? 'Active' : 'Inactive',
        avatar: avatar || DEFAULT_AVATAR,
      });
    } catch (err) {
      console.warn('API error creating user, falling back to local:', err);
      onAddEmployee({
        id: `emp-${Date.now()}`,
        name,
        email,
        phone,
        role,
        employeeId,
        status: 'Active',
        avatar: avatar || DEFAULT_AVATAR,
      });
    }

    closeModal();
    setName('');
    setEmail('');
    setPhone('');
    setAvatar(null);
  };

  const filteredEmployees = employees.filter(e => {
    return selectedRoleFilter === 'All' || e.role === selectedRoleFilter;
  });

  const isEditing = modalMode === 'edit';
  const previewData = staffDetails || previewStaff || null;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Module Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 glass-card p-6 rounded-3xl border border-white/60">
        <div>
          <span className="inline-block px-3 py-1 rounded-full bg-amber-900/10 text-[#693F27] text-xs font-extrabold uppercase tracking-wider mb-2">
            Access Control & RBAC
          </span>
          <h2 className="font-heading font-extrabold text-2xl text-[#3C2A21]">
            Staff & User Management
          </h2>
          <p className="text-xs text-amber-900/70 font-medium">
            Manage store team members, configure role permissions, and audit security logs.
          </p>
        </div>

        {can('staff', 'add') && (
          <button
            onClick={openAdd}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-[#693F27] to-[#3C2A21] text-amber-100 font-extrabold text-xs shadow-lg hover:brightness-110"
          >
            <Icons.UserPlus className="w-4 h-4" /> + Add New Staff Member
          </button>
        )}
      </div>

      {/* Role Filter & Matrix Header */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Staff Cards Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-extrabold text-lg text-[#3C2A21]">Team Directory</h3>
            <div className="flex bg-amber-900/10 p-1 rounded-xl">
              {['All', 'Administrator', 'Manager', 'Cashier', 'Inventory Staff'].map((r) => (
                <button
                  key={r}
                  onClick={() => setSelectedRoleFilter(r)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    selectedRoleFilter === r ? 'bg-[#3C2A21] text-amber-100' : 'text-amber-900/70'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredEmployees.map((emp) => (
              <div
                key={emp.id}
                onClick={() => setSelectedStaff(emp)}
                className={`glass-card p-5 rounded-3xl border border-white/60 cursor-pointer transition-all duration-200 hover:scale-[1.01] ${
                  selectedStaff?.id === emp.id ? 'ring-2 ring-[#C08552] bg-amber-900/10' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <img
                    src={emp.avatar || DEFAULT_AVATAR}
                    alt={emp.name}
                    className="w-12 h-12 rounded-2xl object-cover ring-2 ring-amber-900/20 shadow"
                  />
                  {can('staff', 'edit') ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleEmployeeStatus(emp.id);
                      }}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                        emp.status === 'Active'
                          ? 'bg-emerald-500/10 text-emerald-800 border-emerald-500/20'
                          : 'bg-red-500/10 text-red-800 border-red-500/20'
                      }`}
                    >
                      {emp.status}
                    </button>
                  ) : (
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                      emp.status === 'Active'
                        ? 'bg-emerald-500/10 text-emerald-800 border-emerald-500/20'
                        : 'bg-red-500/10 text-red-800 border-red-500/20'
                    }`}>
                      {emp.status}
                    </span>
                  )}
                </div>

                <h4 className="font-bold text-sm text-[#3C2A21]">{emp.name}</h4>
                <p className="text-xs text-amber-900/60 font-semibold">{emp.role}</p>

                <div className="mt-3 pt-3 border-t border-amber-900/10 text-[11px] text-amber-900/70 space-y-1">
                  <p className="flex items-center gap-1.5"><Icons.IdCard className="w-3.5 h-3.5 text-amber-900/40" /> {emp.employeeId}</p>
                  <p className="flex items-center gap-1.5"><Icons.Mail className="w-3.5 h-3.5 text-amber-900/40" /> {emp.email}</p>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); openPreview(emp); }}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-amber-900/10 text-[#3C2A21] text-[11px] font-bold hover:bg-amber-900/15 transition-colors"
                  >
                    <Icons.Eye className="w-3.5 h-3.5" /> View
                  </button>
                  {can('staff', 'edit') && (
                    <button
                      onClick={(e) => { e.stopPropagation(); openEdit(emp); }}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-amber-900/10 text-[#3C2A21] text-[11px] font-bold hover:bg-amber-900/15 transition-colors"
                    >
                      <Icons.Edit className="w-3.5 h-3.5" /> Edit
                    </button>
                  )}
                  {can('staff', 'delete') && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeletingStaff(emp); }}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-red-500/10 text-red-700 text-[11px] font-bold hover:bg-red-500/20 transition-colors"
                    >
                      <Icons.Trash className="w-3.5 h-3.5" /> Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Role Permissions Matrix Viewer */}
        {selectedStaff && (
          <div className="glass-card rounded-3xl border border-white/60 p-6 space-y-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <img src={selectedStaff.avatar || DEFAULT_AVATAR} className="w-10 h-10 rounded-full object-cover" alt="" />
                <div>
                  <h3 className="font-heading font-extrabold text-base text-[#3C2A21]">{selectedStaff.name}</h3>
                  <span className="text-xs font-bold text-[#C08552]">{selectedStaff.role} Permissions</span>
                </div>
              </div>
              <p className="text-xs text-amber-900/60 font-medium">Fine-tune system capability access matrix.</p>
            </div>

            <div className="space-y-3 border-t border-amber-900/10 pt-4 text-xs font-semibold">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FFFDF9]/80 border border-amber-900/10">
                <span>🛒 POS Operations</span>
                <span className="text-emerald-700 font-extrabold">✅ Allowed</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FFFDF9]/80 border border-amber-900/10">
                <span>📈 Reports & Analytics</span>
                <span className={selectedStaff.role === 'Cashier' ? 'text-red-700 font-extrabold' : 'text-emerald-700 font-extrabold'}>
                  {selectedStaff.role === 'Cashier' ? '❌ Restricted' : '✅ Allowed'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FFFDF9]/80 border border-amber-900/10">
                <span>📦 Inventory & Purchase Orders</span>
                <span className={selectedStaff.role === 'Cashier' ? 'text-red-700 font-extrabold' : 'text-emerald-700 font-extrabold'}>
                  {selectedStaff.role === 'Cashier' ? '❌ Restricted' : '✅ Allowed'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FFFDF9]/80 border border-amber-900/10">
                <span>👥 Employee Management</span>
                <span className={selectedStaff.role === 'Administrator' || selectedStaff.role === 'Manager' ? 'text-emerald-700 font-extrabold' : 'text-red-700 font-extrabold'}>
                  {selectedStaff.role === 'Administrator' || selectedStaff.role === 'Manager' ? '✅ Allowed' : '❌ Restricted'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FFFDF9]/80 border border-amber-900/10">
                <span>⚙️ System Settings & Backups</span>
                <span className={selectedStaff.role === 'Administrator' ? 'text-emerald-700 font-extrabold' : 'text-red-700 font-extrabold'}>
                  {selectedStaff.role === 'Administrator' ? '✅ Allowed' : '❌ Restricted'}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-amber-900/10 space-y-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => openPreview(selectedStaff)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-900/10 text-[#3C2A21] text-xs font-bold hover:bg-amber-900/20 transition-colors"
                >
                  <Icons.Eye className="w-3.5 h-3.5" /> Preview
                </button>
                {can('staff', 'edit') && (
                  <button
                    type="button"
                    onClick={() => openEdit(selectedStaff)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-900/10 text-[#3C2A21] text-xs font-bold hover:bg-amber-900/20 transition-colors"
                  >
                    <Icons.Edit className="w-3.5 h-3.5" /> Edit
                  </button>
                )}
              </div>
              {can('staff', 'delete') && (
                <button
                  type="button"
                  onClick={() => setDeletingStaff(selectedStaff)}
                  className="w-full py-2.5 rounded-xl bg-red-500/10 text-red-700 text-xs font-bold hover:bg-red-500/20 transition-colors"
                >
                  <Icons.Trash className="w-3.5 h-3.5 inline mr-1.5" /> Delete Staff Member
                </button>
              )}
              <button
                type="button"
                onClick={() => alert(`Reset Password link generated for ${selectedStaff.name}`)}
                className="w-full py-2.5 rounded-xl bg-[#3C2A21] text-amber-100 text-xs font-bold shadow hover:brightness-110"
              >
                🔒 Issue Password Reset
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Staff Modal */}
      {modalOpen && (
        <ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md glass-card rounded-3xl p-6 space-y-4 border border-white/60 max-h-[90vh] overflow-y-auto">
            <h3 className="font-heading font-extrabold text-xl text-[#3C2A21]">
              {isEditing ? 'Edit Staff Member' : 'Add New Staff Member'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#4A2E2A] mb-1">Profile Photo</label>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden ring-2 ring-amber-900/10 bg-amber-900/5 flex items-center justify-center shrink-0">
                    {avatar ? <img src={avatar} alt="Preview" className="w-full h-full object-cover" /> : <Icons.User className="w-7 h-7 text-amber-900/40" />}
                  </div>
                  <label className="flex-1 cursor-pointer flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-900/10 text-xs font-bold text-[#3C2A21] hover:bg-amber-900/15 transition-colors border border-amber-900/10">
                    <Icons.Camera className="w-3.5 h-3.5" /> {avatar ? 'Change Photo' : 'Attach Photo'}
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                  </label>
                  {avatar && (
                    <button
                      type="button"
                      onClick={() => setAvatar(null)}
                      className="text-[11px] font-bold text-red-600/70 hover:text-red-700 whitespace-nowrap"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4A2E2A] mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl glass-input text-[#3C2A21]"
                  placeholder="e.g. Marcus Vance"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4A2E2A] mb-1">Employee ID Code <span className="text-amber-900/40 font-normal">(auto-generated)</span></label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Icons.IdCard className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-amber-900/40" />
                    <input
                      type="text"
                      readOnly
                      value={employeeId}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl glass-input font-bold text-[#3C2A21] bg-amber-900/5"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setEmployeeId(generateEmployeeId(role, employees))}
                    title="Regenerate code"
                    className="p-2 rounded-xl bg-amber-900/10 text-[#3C2A21] hover:bg-amber-900/20 transition-colors border border-amber-900/10"
                  >
                    <Icons.Shuffle className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4A2E2A] mb-1">Role Assignment</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl glass-input font-semibold text-[#3C2A21]"
                >
                  <option value="Cashier">Cashier (Front POS)</option>
                  <option value="Manager">Manager (Store Ops)</option>
                  <option value="Inventory Staff">Inventory Staff (Stock & POs)</option>
                  <option value="Administrator">Administrator (Full Access)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4A2E2A] mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl glass-input text-[#3C2A21]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4A2E2A] mb-1">Contact Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl glass-input text-[#3C2A21]"
                  placeholder="e.g. +63 912 345 6789"
                />
              </div>

              {!isEditing && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-900 font-semibold space-y-1">
                  <p className="font-extrabold uppercase tracking-wider text-[10px] text-amber-800">Auto-generated credentials</p>
                  <p>🔑 Password: <span className="font-extrabold text-[#3C2A21]">{generatePassword(name || 'lastname')}</span></p>
                  <p>🔢 PIN: <span className="font-extrabold text-[#3C2A21]">{generatePin(employeeId)}</span></p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2.5 rounded-xl bg-amber-900/10 text-xs font-bold text-[#3C2A21]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#3C2A21] text-amber-100 text-xs font-bold shadow-md hover:brightness-110"
                >
                  {isEditing ? 'Save Changes' : 'Save Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Preview Staff Modal */}
      {previewStaff && (
        <ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm glass-card rounded-3xl p-6 space-y-5 border border-white/60 text-center">
            <div className="relative w-24 h-24 mx-auto">
              <img
                src={previewData?.avatar || previewStaff.avatar || DEFAULT_AVATAR}
                alt={previewData?.name || previewStaff.name}
                className="w-24 h-24 rounded-3xl object-cover ring-4 ring-amber-900/10 shadow-lg mx-auto"
              />
              <span className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-[#FFFDF9] ${
                (previewData?.is_active ?? previewStaff.status === 'Active') ? 'bg-emerald-500' : 'bg-red-500'
              }`} />
            </div>

            <div>
              <h3 className="font-heading font-extrabold text-xl text-[#3C2A21]">{previewData?.name || previewStaff.name}</h3>
              <span className="inline-block px-3 py-1 mt-1 rounded-full bg-amber-900/10 text-[#693F27] text-xs font-extrabold">
                {previewData ? (DB_ROLE_TO_LABEL[previewData.role] || previewData.role) : previewStaff.role}
              </span>
            </div>

            <div className="space-y-2 text-left text-xs font-semibold text-amber-900/80 bg-amber-900/5 rounded-2xl p-4">
              <p className="flex items-center gap-2"><Icons.IdCard className="w-4 h-4 text-amber-900/40" /> <span className="text-amber-900/50">Employee ID:</span> <span className="text-[#3C2A21] font-extrabold">{previewStaff.employeeId}</span></p>
              <p className="flex items-center gap-2"><Icons.Mail className="w-4 h-4 text-amber-900/40" /> <span className="text-amber-900/50">Email:</span> <span className="text-[#3C2A21] font-extrabold break-all">{previewData?.email || previewStaff.email}</span></p>
              <p className="flex items-center gap-2">📞 <span className="text-amber-900/50">Contact:</span> <span className="text-[#3C2A21] font-extrabold">{previewStaff.phone || '—'}</span></p>
              <p className="flex items-center gap-2">🔄 <span className="text-amber-900/50">Status:</span> <span className={`font-extrabold ${previewData ? (previewData.is_active ? 'text-emerald-700' : 'text-red-700') : (previewStaff.status === 'Active' ? 'text-emerald-700' : 'text-red-700')}`}>
                {previewData ? (previewData.is_active ? 'Active' : 'Inactive') : previewStaff.status}
              </span></p>
              {previewData?.created_at && (
                <p className="flex items-center gap-2">📅 <span className="text-amber-900/50">Member since:</span> <span className="text-[#3C2A21] font-extrabold">{new Date(previewData.created_at).toLocaleDateString()}</span></p>
              )}
            </div>

            <div className="flex gap-2">
              {can('staff', 'edit') && (
                <button
                  onClick={() => openEdit(previewStaff)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#3C2A21] text-amber-100 text-xs font-bold shadow-md hover:brightness-110"
                >
                  <Icons.Edit className="w-3.5 h-3.5" /> Edit
                </button>
              )}
              {can('staff', 'delete') && (
                <button
                  onClick={() => setDeletingStaff(previewStaff)}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-red-500/10 text-red-700 text-xs font-bold hover:bg-red-500/20 transition-colors"
                >
                  <Icons.Trash className="w-3.5 h-3.5" /> Delete
                </button>
              )}
              <button
                onClick={() => { setPreviewStaff(null); setStaffDetails(null); }}
                className="flex-1 py-2.5 rounded-xl bg-amber-900/10 text-xs font-bold text-[#3C2A21] hover:bg-amber-900/20 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Delete Staff Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingStaff}
        onClose={() => setDeletingStaff(null)}
        onConfirm={() => handleDelete(deletingStaff.id)}
        title="Delete Staff Member"
        message={`Are you sure you want to permanently remove ${deletingStaff?.name || 'this staff member'}? This cannot be undone.`}
        confirmLabel="Delete Staff"
        cancelLabel="Cancel"
        variant="danger"
      />
    </div>
  );
}
