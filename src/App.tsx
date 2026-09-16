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

// واجهة تعريف بيانات الدين
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
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // نماذج الإدخال
  const [customerName, setCustomerName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // 1. الاستماع للحسابات والتحديثات اللحظية من Firebase
  useEffect(() => {
    const debtsCollection = collection(db, 'debts');
    
    // فتح خط مزامنة حية أونلاين
    const unsubscribe = onSnapshot(debtsCollection, (snapshot) => {
      const loadedDebts: Debt[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Debt[];

      setDebts(loadedDebts);
      setLoading(false);
    }, (error) => {
      console.error("خطأ في جلب البيانات سحابياً:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. إضافة دين جديد
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

      // تفريغ الحقول بعد النجاح
      setCustomerName('');
      setPhone('');
      setAmount('');
      setNotes('');
    } catch (error) {
      console.error("خطأ أثناء إرسال البيانات للسحابة:", error);
      alert("حدث خطأ أثناء الاتصال بالسحابة. حاول مرة أخرى.");
    }
  };

  // 3. تبديل حالة السداد (سداد كامل / غير مسدد)
  const handleTogglePaid = async (debt: Debt) => {
    if (!debt.id) return;
    try {
      const debtRef = doc(db, 'debts', debt.id);
      await updateDoc(debtRef, {
        isPaid: !debt.isPaid,
      });
    } catch (error) {
      console.error("خطأ أثناء تحديث حالة السداد:", error);
    }
  };

  // 4. حذف دين
  const handleDeleteDebt = async (id?: string) => {
    if (!id) return;
    if (!window.confirm("هل أنت أصلًا متأكد من حذف هذا السجل؟")) return;

    try {
      await deleteDoc(doc(db, 'debts', id));
    } catch (error) {
      console.error("خطأ أثناء حذف الدين:", error);
    }
  };

  // تصفية الديون حسب البحث
  const filteredDebts = debts.filter((debt) =>
    debt.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (debt.phone && debt.phone.includes(searchTerm))
  );

  // حساب الإحصائيات
  const totalDebtsAmount = debts
    .filter((d) => !d.isPaid)
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif', direction: 'rtl' }}>
      <header style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h2>🏪 دفتر ديون السوبرماركت (سحابي)</h2>
        <div style={{ background: '#f0f4f8', padding: '15px', borderRadius: '10px', marginTop: '10px' }}>
          <h3>مجموع الديون المتبقية: <span style={{ color: '#d32f2f' }}>{totalDebtsAmount.toLocaleString()} د.ع</span></h3>
        </div>
      </header>

      {/* نموذج إضافة دين */}
      <form onSubmit={handleAddDebt} style={{ background: '#ffffff', padding: '20px', border: '1px solid #ddd', borderRadius: '10px', marginBottom: '30px' }}>
        <h4>تسجيل دين جديد</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <input
            type="text"
            placeholder="اسم الزبون *"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            required
            style={{ padding: '10px', fontSize: '16px' }}
          />
          <input
            type="tel"
            placeholder="رقم الهاتف (اختياري)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={{ padding: '10px', fontSize: '16px' }}
          />
          <input
            type="number"
            placeholder="المبلغ (د.ع) *"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            style={{ padding: '10px', fontSize: '16px' }}
          />
          <input
            type="text"
            placeholder="ملاحظات أو المواد"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ padding: '10px', fontSize: '16px' }}
          />
        </div>
        <button
          type="submit"
          style={{ width: '100%', padding: '12px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: '5px', fontSize: '16px', cursor: 'pointer' }}
        >
          حفظ سحابياً
        </button>
      </form>

      {/* البحث */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="ابحث باسم الزبون أو رقم الهاتف..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '100%', padding: '12px', fontSize: '16px', borderRadius: '5px', border: '1px solid #ccc' }}
        />
      </div>

      {/* قائمة الديون */}
      {loading ? (
        <p style={{ textAlign: 'center' }}>جاري تحميل البيانات من السحابة...</p>
      ) : filteredDebts.length === 0 ? (
        <p style={{ textAlign: 'center' }}>لا توجد ديون مسجلة حالياً.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredDebts.map((debt) => (
            <div
              key={debt.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '15px',
                border: '1px solid #eee',
                borderRadius: '8px',
                backgroundColor: debt.isPaid ? '#e8f5e9' : '#fff',
                textDecoration: debt.isPaid ? 'line-through' : 'none',
              }}
            >
              <div>
                <strong style={{ fontSize: '18px' }}>{debt.customerName}</strong>
                {debt.phone && <span style={{ marginRight: '10px', color: '#666', fontSize: '14px' }}>({debt.phone})</span>}
                <div style={{ fontSize: '16px', color: debt.isPaid ? '#2e7d32' : '#c62828', marginTop: '5px' }}>
                  {debt.amount.toLocaleString()} د.ع
                </div>
                {debt.notes && <div style={{ fontSize: '13px', color: '#777', marginTop: '3px' }}>{debt.notes}</div>}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => handleTogglePaid(debt)}
                  style={{
                    padding: '8px 12px',
                    border: 'none',
                    borderRadius: '5px',
                    backgroundColor: debt.isPaid ? '#ff9800' : '#4caf50',
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  {debt.isPaid ? 'إلغاء التسديد' : 'تم التسديد'}
                </button>

                <button
                  onClick={() => handleDeleteDebt(debt.id)}
                  style={{
                    padding: '8px 12px',
                    border: 'none',
                    borderRadius: '5px',
                    backgroundColor: '#f44336',
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
