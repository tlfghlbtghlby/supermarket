import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';

export interface Debt {
  id?: string;
  customerName: string;
  phone?: string;
  amount: number;
  notes?: string;
  isPaid: boolean;
  createdAt?: any;
}

export default function App() {
  // حالة تسجيل الدخول والاتصال
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loginPhone, setLoginPhone] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');

  // حالات البيانات
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // حالات الإدخال للديون
  const [customerName, setCustomerName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // التحقق من الجلسة المحفوظة سابقاً
  useEffect(() => {
    const savedAuth = localStorage.getItem('app_authenticated');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // الاستماع للبيانات من Firebase بمجرد تسجيل الدخول
  useEffect(() => {
    if (!isAuthenticated) return;

    setLoading(true);
    const debtsCollection = collection(db, 'debts');
    
    const unsubscribe = onSnapshot(debtsCollection, (snapshot) => {
      const loadedDebts: Debt[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Debt[];

      setDebts(loadedDebts);
      setLoading(false);
    }, (error) => {
      console.error("خطأ في الاتصال بقاعدة البيانات السحابية:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAuthenticated]);

  // دالة تسجيل الدخول
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    // يمكن تعديل كلمة المرور أو رقم الهاتف المفتاح هنا
    if (loginPhone === '07700000000' && loginPassword === '123456') {
      setIsAuthenticated(true);
      localStorage.setItem('app_authenticated', 'true');
    } else if (loginPhone.trim() !== '' && loginPassword.trim() !== '') {
      // السماح بدخول افتراضي عند إدخال بيانات غير فارغة
      setIsAuthenticated(true);
      localStorage.setItem('app_authenticated', 'true');
    } else {
      setAuthError('يرجى إدخال رقم الهاتف وكلمة المرور الصحيحة.');
    }
  };

  // تسجيل الخروج
  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('app_authenticated');
  };

  // إضافة دين
  const handleAddDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !amount) return;

    try {
      await addDoc(collection(db, 'debts'), {
        customerName: customerName.trim(),
        phone: phone.trim(),
        amount: parseFloat(amount),
        notes: notes.trim(),
        isPaid: false,
        createdAt: serverTimestamp(),
      });

      setCustomerName('');
      setPhone('');
      setAmount('');
      setNotes('');
    } catch (error) {
      console.error("خطأ أثناء الحفظ:", error);
      alert("تعذر الحفظ في السحابة. تأكد من جودة الاتصال.");
    }
  };

  // تبديل التسديد
  const handleTogglePaid = async (debt: Debt) => {
    if (!debt.id) return;
    try {
      const debtRef = doc(db, 'debts', debt.id);
      await updateDoc(debtRef, { isPaid: !debt.isPaid });
    } catch (error) {
      console.error("خطأ التحديث:", error);
    }
  };

  // الحذف
  const handleDeleteDebt = async (id?: string) => {
    if (!id) return;
    if (!window.confirm("هل أنت متأكد من حذف هذا السجل نهائياً؟")) return;

    try {
      await deleteDoc(doc(db, 'debts', id));
    } catch (error) {
      console.error("خطأ الحذف:", error);
    }
  };

  // تصفية وحساب
  const filteredDebts = debts.filter((d) =>
    d.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.phone && d.phone.includes(searchTerm))
  );

  const totalDebtsAmount = debts
    .filter((d) => !d.isPaid)
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);

  // شاشة تسجيل الدخول المرفوعة قبل فتح التطبيق
  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#121212', color: '#fff', direction: 'rtl', padding: '20px' }}>
        <form onSubmit={handleLogin} style={{ background: '#1e1e1e', padding: '30px', borderRadius: '12px', width: '100%', maxWidth: '400px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#4caf50' }}>🔐 تسجيل الدخول للبرنامج</h2>
          <p style={{ textAlign: 'center', fontSize: '14px', color: '#aaa', marginBottom: '20px' }}>يجب الربط أولاً للدخول لدفتر الديون السحابي</p>
          
          {authError && <div style={{ background: '#d32f2f', color: '#fff', padding: '10px', borderRadius: '5px', marginBottom: '15px', fontSize: '14px', textAlign: 'center' }}>{authError}</div>}

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>رقم الهاتف / اسم المستخدم</label>
            <input
              type="text"
              placeholder="أدخل رقم الهاتف"
              value={loginPhone}
              onChange={(e) => setLoginPhone(e.target.value)}
              required
              style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #333', background: '#2a2a2a', color: '#fff', fontSize: '16px', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>كلمة المرور</label>
            <input
              type="password"
              placeholder="أدخل كلمة المرور"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #333', background: '#2a2a2a', color: '#fff', fontSize: '16px', boxSizing: 'border-box' }}
            />
          </div>

          <button
            type="submit"
            style={{ width: '100%', padding: '12px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            دخول ومزامنة
          </button>
        </form>
      </div>
    );
  }

  // التطبيق الرئيسي بعد تسجيل الدخول والربط
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif', direction: 'rtl', minHeight: '100vh', background: '#fafafa' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>🏪 دفتر ديون السوبرماركت</h2>
        <button onClick={handleLogout} style={{ padding: '8px 12px', background: '#d32f2f', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>خروج</button>
      </header>

      <div style={{ background: '#e8f5e9', padding: '15px', borderRadius: '10px', marginBottom: '20px', textAlign: 'center' }}>
        <h3 style={{ margin: 0, color: '#2e7d32' }}>المجموع الكلي المتبقي: {totalDebtsAmount.toLocaleString()} د.ع</h3>
      </div>

      {/* نموذج الإضافة */}
      <form onSubmit={handleAddDebt} style={{ background: '#ffffff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: '25px' }}>
        <h4 style={{ marginTop: 0 }}>تسجيل دين جديد</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <input type="text" placeholder="اسم الزبون *" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required style={{ padding: '10px', fontSize: '15px' }} />
          <input type="tel" placeholder="رقم الهاتف" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ padding: '10px', fontSize: '15px' }} />
          <input type="number" placeholder="المبلغ (د.ع) *" value={amount} onChange={(e) => setAmount(e.target.value)} required style={{ padding: '10px', fontSize: '15px' }} />
          <input type="text" placeholder="ملاحظات" value={notes} onChange={(e) => setNotes(e.target.value)} style={{ padding: '10px', fontSize: '15px' }} />
        </div>
        <button type="submit" style={{ width: '100%', padding: '12px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: '5px', fontSize: '16px', cursor: 'pointer' }}>حفظ المزامنة</button>
      </form>

      {/* البحث */}
      <input type="text" placeholder="ابحث باسم الزبون..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '12px', fontSize: '15px', borderRadius: '5px', border: '1px solid #ccc', marginBottom: '20px', boxSizing: 'border-box' }} />

      {/* القائمة */}
      {loading ? (
        <p style={{ textAlign: 'center' }}>جاري ربط واستدعاء البيانات السحابية...</p>
      ) : filteredDebts.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#888' }}>لا توجد أي سجلات حالياً (البرنامج مصفّر).</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredDebts.map((debt) => (
            <div key={debt.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', background: debt.isPaid ? '#e8f5e9' : '#fff', border: '1px solid #ddd', borderRadius: '8px' }}>
              <div>
                <strong>{debt.customerName}</strong> {debt.phone && <small>({debt.phone})</small>}
                <div style={{ color: debt.isPaid ? '#2e7d32' : '#c62828', fontWeight: 'bold' }}>{debt.amount.toLocaleString()} د.ع</div>
                {debt.notes && <small style={{ color: '#666' }}>{debt.notes}</small>}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => handleTogglePaid(debt)} style={{ padding: '6px 10px', background: debt.isPaid ? '#ff9800' : '#4caf50', color: '#fff', border: 'none', borderRadius: '4px' }}>{debt.isPaid ? 'إلغاء' : 'تسديد'}</button>
                <button onClick={() => handleDeleteDebt(debt.id)} style={{ padding: '6px 10px', background: '#f44336', color: '#fff', border: 'none', borderRadius: '4px' }}>حذف</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
