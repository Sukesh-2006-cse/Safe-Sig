import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { UserProfile } from '@/services/mongoService';
import { registerOrUpdateUser, loginWithMobileAndPin } from '@/services/authService';

const BLOOD_GROUPS = ['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-'];

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  onAuthSuccess: (profile: UserProfile) => void;
  currentUser?: UserProfile | null;
}

export function AuthModal({ visible, onClose, onAuthSuccess, currentUser }: AuthModalProps) {
  const [mode, setMode] = useState<'register' | 'login'>(currentUser ? 'register' : 'register');
  const [name, setName] = useState(currentUser?.name || 'Sukesh M');
  const [mobileNumber, setMobileNumber] = useState(currentUser?.mobileNumber || '9876543210');
  const [emergencyContactName, setEmergencyContactName] = useState(currentUser?.emergencyContactName || 'Priya S (Sister)');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(currentUser?.emergencyContactPhone || '9876500000');
  const [bloodGroup, setBloodGroup] = useState(currentUser?.bloodGroup || 'O+');
  const [passcode, setPasscode] = useState(currentUser?.passcode || '1234');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (mode === 'register') {
        const res = await registerOrUpdateUser({
          name,
          mobileNumber,
          emergencyContactName,
          emergencyContactPhone,
          bloodGroup,
          passcode,
        });
        setLoading(false);
        if (res.success && res.profile) {
          setSuccessMsg('Account saved & synced to MongoDB Atlas!');
          setTimeout(() => {
            onAuthSuccess(res.profile!);
            onClose();
          }, 800);
        } else {
          setErrorMsg(res.message || 'Registration failed.');
        }
      } else {
        const res = await loginWithMobileAndPin(mobileNumber, passcode);
        setLoading(false);
        if (res.success && res.profile) {
          setSuccessMsg('Logged in successfully!');
          setTimeout(() => {
            onAuthSuccess(res.profile!);
            onClose();
          }, 800);
        } else {
          setErrorMsg(res.message || 'Login failed.');
        }
      }
    } catch (err: any) {
      setLoading(false);
      setErrorMsg('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleGroup}>
              <View style={styles.brandBadge}>
                <Icon name="shield-checkmark" size={20} color="#2563EB" />
              </View>
              <View>
                <Text style={styles.eyebrow}>SAFESIGNAL AI AUTHENTICATION</Text>
                <Text style={styles.title}>
                  {currentUser ? 'Update User Details' : mode === 'register' ? 'Register Profile' : 'Sign In Account'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Mode Switcher */}
          {!currentUser ? (
            <View style={styles.tabContainer}>
              <TouchableOpacity
                onPress={() => { setMode('register'); setErrorMsg(''); setSuccessMsg(''); }}
                style={[styles.tabBtn, mode === 'register' && styles.activeTabBtn]}
              >
                <Text style={[styles.tabText, mode === 'register' && styles.activeTabText]}>Register Details</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
                style={[styles.tabBtn, mode === 'login' && styles.activeTabBtn]}
              >
                <Text style={[styles.tabText, mode === 'login' && styles.activeTabText]}>Sign In (Mobile PIN)</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Form */}
          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
            {errorMsg ? (
              <View style={styles.errorBox}>
                <Icon name="alert-circle" size={16} color="#DC2626" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {successMsg ? (
              <View style={styles.successBox}>
                <Icon name="checkmark-circle" size={16} color="#059669" />
                <Text style={styles.successText}>{successMsg}</Text>
              </View>
            ) : null}

            {mode === 'register' ? (
              <>
                <Text style={styles.inputLabel}>FULL NAME</Text>
                <View style={styles.inputShell}>
                  <Icon name="person-outline" size={18} color="#64748B" />
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter your full name"
                    placeholderTextColor="#94A3B8"
                    style={styles.textInput}
                  />
                </View>

                <Text style={styles.inputLabel}>MOBILE NUMBER (10 DIGITS)</Text>
                <View style={styles.inputShell}>
                  <Icon name="call-outline" size={18} color="#64748B" />
                  <TextInput
                    value={mobileNumber}
                    onChangeText={setMobileNumber}
                    keyboardType="number-pad"
                    maxLength={10}
                    placeholder="e.g. 9876543210"
                    placeholderTextColor="#94A3B8"
                    style={styles.textInput}
                  />
                </View>

                <Text style={styles.inputLabel}>EMERGENCY CONTACT NAME</Text>
                <View style={styles.inputShell}>
                  <Icon name="heart-outline" size={18} color="#64748B" />
                  <TextInput
                    value={emergencyContactName}
                    onChangeText={setEmergencyContactName}
                    placeholder="e.g. Priya S. (Sister)"
                    placeholderTextColor="#94A3B8"
                    style={styles.textInput}
                  />
                </View>

                <Text style={styles.inputLabel}>EMERGENCY CONTACT MOBILE</Text>
                <View style={styles.inputShell}>
                  <Icon name="phone-portrait-outline" size={18} color="#64748B" />
                  <TextInput
                    value={emergencyContactPhone}
                    onChangeText={setEmergencyContactPhone}
                    keyboardType="number-pad"
                    maxLength={10}
                    placeholder="e.g. 9876500000"
                    placeholderTextColor="#94A3B8"
                    style={styles.textInput}
                  />
                </View>

                <Text style={styles.inputLabel}>BLOOD GROUP</Text>
                <View style={styles.bloodChipRow}>
                  {BLOOD_GROUPS.map((bg) => (
                    <TouchableOpacity
                      key={bg}
                      onPress={() => setBloodGroup(bg)}
                      style={[styles.bloodChip, bloodGroup === bg && styles.bloodChipSelected]}
                    >
                      <Text style={[styles.bloodChipText, bloodGroup === bg && styles.bloodChipTextSelected]}>
                        {bg}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>SET 4-DIGIT SECURITY PIN</Text>
                <View style={styles.inputShell}>
                  <Icon name="lock-closed-outline" size={18} color="#64748B" />
                  <TextInput
                    value={passcode}
                    onChangeText={setPasscode}
                    keyboardType="number-pad"
                    secureTextEntry
                    maxLength={4}
                    placeholder="4-digit PIN"
                    placeholderTextColor="#94A3B8"
                    style={styles.textInput}
                  />
                </View>
              </>
            ) : (
              <>
                <Text style={styles.inputLabel}>MOBILE NUMBER</Text>
                <View style={styles.inputShell}>
                  <Icon name="call-outline" size={18} color="#64748B" />
                  <TextInput
                    value={mobileNumber}
                    onChangeText={setMobileNumber}
                    keyboardType="number-pad"
                    maxLength={10}
                    placeholder="Enter registered 10-digit mobile"
                    placeholderTextColor="#94A3B8"
                    style={styles.textInput}
                  />
                </View>

                <Text style={styles.inputLabel}>4-DIGIT SECURITY PIN</Text>
                <View style={styles.inputShell}>
                  <Icon name="lock-closed-outline" size={18} color="#64748B" />
                  <TextInput
                    value={passcode}
                    onChangeText={setPasscode}
                    keyboardType="number-pad"
                    secureTextEntry
                    maxLength={4}
                    placeholder="Enter 4-digit PIN"
                    placeholderTextColor="#94A3B8"
                    style={styles.textInput}
                  />
                </View>
              </>
            )}

            <View style={styles.mongoBadge}>
              <Icon name="server-outline" size={13} color="#059669" />
              <Text style={styles.mongoBadgeText}>Directly syncs & stores to MongoDB Atlas Cloud</Text>
            </View>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading}
              style={styles.submitBtn}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Icon name={mode === 'register' ? 'cloud-upload' : 'log-in-outline'} size={18} color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>
                    {mode === 'register' ? 'Save & Sync to MongoDB' : 'Sign In Now'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: '800',
    color: '#2563EB',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 9,
  },
  activeTabBtn: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  activeTabText: {
    color: '#2563EB',
    fontWeight: '700',
  },
  formScroll: {
    paddingBottom: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
    flex: 1,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderColor: '#6EE7B7',
    borderWidth: 1,
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  successText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
    flex: 1,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 5,
  },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
  },
  bloodChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 4,
  },
  bloodChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bloodChipSelected: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  bloodChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  bloodChipTextSelected: {
    color: '#FFFFFF',
  },
  mongoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 12,
  },
  mongoBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  submitBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
