import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, Edit, Calendar as CalendarIcon, Users, MapPin, Video, LayoutDashboard, Save, X, BarChart2, DollarSign, ListTodo, ExternalLink, Download, MessageCircle, Wallet, Send } from 'lucide-react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import * as XLSX from 'xlsx';

const localizer = momentLocalizer(moment);

function Dashboard({ user }) {
  const [activeTab, setActiveTab] = useState('analytics'); // calendar, events, operators, analytics, finance, kanban, expenses
  const [events, setEvents] = useState([]);
  const [operators, setOperators] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [expenses, setExpenses] = useState([]);
  
  const [newOp, setNewOp] = useState({ username: '', password: '', fullName: '', telegramUsername: '' });
  const [editOpId, setEditOpId] = useState(null);

  const [newEvent, setNewEvent] = useState({ 
    title: '', date: '', location: '', venue: '', cameraCount: 1, assignedOperators: [],
    clientName: '', clientPhone: '', budget: 0, advancePayment: 0, status: 'Kutilmoqda', comment: ''
  });
  const [editEventId, setEditEventId] = useState(null);

  const [newExpense, setNewExpense] = useState({ description: '', amount: 0, date: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const [eventsRes, operatorsRes, analyticsRes, expensesRes] = await Promise.all([
        axios.get('/api/events', config),
        axios.get('/api/operators', config),
        axios.get('/api/analytics', config),
        axios.get('/api/expenses', config)
      ]);
      setEvents(eventsRes.data);
      setOperators(operatorsRes.data);
      setAnalytics(analyticsRes.data);
      setExpenses(expensesRes.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddOperator = async (e) => {
    e.preventDefault();
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      if (editOpId) {
        await axios.put(`/api/operators/${editOpId}`, newOp, config);
      } else {
        await axios.post('/api/operators', newOp, config);
      }
      setNewOp({ username: '', password: '', fullName: '', telegramUsername: '' });
      setEditOpId(null);
      fetchData();
    } catch (error) {
      alert("Xatolik");
    }
  };

  const handleEditOperator = (op) => {
    setEditOpId(op._id);
    setNewOp({ username: op.username, password: '', fullName: op.fullName, telegramUsername: op.telegramUsername || '' });
    setActiveTab('operators');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditOperator = () => {
    setEditOpId(null);
    setNewOp({ username: '', password: '', fullName: '', telegramUsername: '' });
  };

  const handleDeleteOperator = async (id) => {
    if (!window.confirm("Rostdan ham o'chirmoqchimisiz?")) return;
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.delete(`/api/operators/${id}`, config);
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      if (editEventId) {
        await axios.put(`/api/events/${editEventId}`, newEvent, config);
      } else {
        await axios.post('/api/events', newEvent, config);
      }
      setNewEvent({ title: '', date: '', location: '', venue: '', cameraCount: 1, assignedOperators: [], clientName: '', clientPhone: '', budget: 0, advancePayment: 0, status: 'Kutilmoqda' });
      setEditEventId(null);
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleEditEvent = (event) => {
    setEditEventId(event._id);
    const dateStr = new Date(event.date);
    const offset = dateStr.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(dateStr - offset)).toISOString().slice(0, 16);
    
    setNewEvent({
      title: event.title,
      date: localISOTime,
      location: event.location,
      venue: event.venue,
      cameraCount: event.cameraCount,
      assignedOperators: event.assignedOperators.map(op => op._id),
      clientName: event.clientName || '',
      clientPhone: event.clientPhone || '',
      budget: event.budget || 0,
      advancePayment: event.advancePayment || 0,
      status: event.status || 'Kutilmoqda',
      comment: event.comment || ''
    });
    setActiveTab('events');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditEvent = () => {
    setEditEventId(null);
    setNewEvent({ title: '', date: '', location: '', venue: '', cameraCount: 1, assignedOperators: [], clientName: '', clientPhone: '', budget: 0, advancePayment: 0, status: 'Kutilmoqda', comment: '' });
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm("Rostdan ham o'chirmoqchimisiz?")) return;
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.delete(`/api/events/${id}`, config);
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.post('/api/expenses', newExpense, config);
      setNewExpense({ description: '', amount: 0, date: '' });
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm("Xarajatni o'chirmoqchimisiz?")) return;
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.delete(`/api/expenses/${id}`, config);
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleOperatorSelect = (e) => {
    const options = Array.from(e.target.selectedOptions, option => option.value);
    setNewEvent({ ...newEvent, assignedOperators: options });
  };

  const exportToExcel = () => {
    const dataToExport = events.map(e => ({
      "Mijoz Ismi": e.clientName || e.title,
      "To'y Sanasi": new Date(e.date).toLocaleDateString('uz-UZ'),
      "Telefon": e.clientPhone,
      "Umumiy Narx ($)": e.budget,
      "Berilgan Avans ($)": e.advancePayment,
      "Qarz ($)": (e.budget || 0) - (e.advancePayment || 0),
      "Holat": e.status
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Moliyaviy Hisobot");
    XLSX.writeFile(workbook, "Moliya_Mijozlar_Hisoboti.xlsx");
  };

  const handleShareTelegram = async (event) => {
    if (!window.confirm("Barcha biriktirilgan operatorlarga avtomatik xabar yuborilsinmi?")) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`/api/events/${event._id}/send`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(response.data.message);
    } catch (error) {
      alert(error.response?.data?.message || 'Xatolik yuz berdi');
    }
  };

  const calendarEvents = events.map(e => ({
    id: e._id,
    title: `${e.title} (${e.venue})`,
    start: new Date(e.date),
    end: new Date(new Date(e.date).getTime() + 6 * 60 * 60 * 1000),
    resource: e
  }));

  const kanbanColumns = ['Kutilmoqda', 'Syomka qilindi', 'Montajda', 'Tayyor', 'Topshirildi'];

  return (
    <div>
      <div className="dashboard-header" style={{ marginBottom: '1.5rem' }}>
        <h1 className="dashboard-title">Boshqaruv Paneli</h1>
      </div>

      <div className="tabs-container fade-in-up" style={{ overflowX: 'auto', whiteSpace: 'nowrap' }}>
        <button className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
          <BarChart2 size={18} /> Statistika
        </button>
        <button className={`tab-btn ${activeTab === 'finance' ? 'active' : ''}`} onClick={() => setActiveTab('finance')}>
          <DollarSign size={18} /> Moliya & Mijozlar
        </button>
        <button className={`tab-btn ${activeTab === 'expenses' ? 'active' : ''}`} onClick={() => setActiveTab('expenses')}>
          <Wallet size={18} /> Xarajatlar
        </button>
        <button className={`tab-btn ${activeTab === 'kanban' ? 'active' : ''}`} onClick={() => setActiveTab('kanban')}>
          <ListTodo size={18} /> Montaj (Kanban)
        </button>
        <button className={`tab-btn ${activeTab === 'calendar' ? 'active' : ''}`} onClick={() => setActiveTab('calendar')}>
          <CalendarIcon size={18} /> Kalendar
        </button>
        <button className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`} onClick={() => setActiveTab('events')}>
          <LayoutDashboard size={18} /> To'ylar
        </button>
        <button className={`tab-btn ${activeTab === 'operators' ? 'active' : ''}`} onClick={() => setActiveTab('operators')}>
          <Users size={18} /> Operatorlar
        </button>
      </div>

      <div className="tab-content" style={{ marginTop: '1.5rem' }}>
        
        {/* STATISTIKA */}
        {activeTab === 'analytics' && analytics && (
          <div className="fade-in-up">
            <div className="grid grid-cols-4" style={{ gap: '1rem', marginBottom: '2rem' }}>
              <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
                <div className="text-muted" style={{ fontSize: '0.875rem', fontWeight: 600 }}>UMUMIY TO'YLAR</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'white' }}>{analytics.totalEvents} ta</div>
              </div>
              <div className="card" style={{ borderLeft: '4px solid var(--success)' }}>
                <div className="text-muted" style={{ fontSize: '0.875rem', fontWeight: 600 }}>TUSHUMLAR</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--success)' }}>${analytics.totalBudget?.toLocaleString() || 0}</div>
              </div>
              <div className="card" style={{ borderLeft: '4px solid var(--danger)' }}>
                <div className="text-muted" style={{ fontSize: '0.875rem', fontWeight: 600 }}>XARAJATLAR</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--danger)' }}>${analytics.totalExpense?.toLocaleString() || 0}</div>
              </div>
              <div className="card" style={{ borderLeft: '4px solid #f59e0b', background: 'rgba(245, 158, 11, 0.05)' }}>
                <div className="text-muted" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fcd34d' }}>SOF FOYDA (NET PROFIT)</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f59e0b' }}>${analytics.netProfit?.toLocaleString() || 0}</div>
              </div>
            </div>
            
            <div className="card">
              <h2 className="card-title mb-4">Oylik Moliyaviy Analitika</h2>
              <div style={{ width: '100%', height: 400 }}>
                <ResponsiveContainer>
                  <BarChart data={analytics.monthlyChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="month" stroke="var(--text-muted)" />
                    <YAxis stroke="var(--text-muted)" />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-dark)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                    <Legend />
                    <Bar dataKey="budget" name="Tushum ($)" fill="var(--success)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Xarajat ($)" fill="var(--danger)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="profit" name="Sof Foyda ($)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* XARAJATLAR */}
        {activeTab === 'expenses' && (
          <div className="grid grid-cols-2 fade-in-up" style={{alignItems: 'start'}}>
            <div className="card">
              <h2 className="card-title"><Wallet size={20} /> Xarajat Qo'shish</h2>
              <form onSubmit={handleAddExpense}>
                <div className="form-group">
                  <label className="form-label">Xarajat nomi (M-n: Kamera arendasi, Ofis ijara)</label>
                  <input type="text" className="form-input" value={newExpense.description} onChange={e => setNewExpense({...newExpense, description: e.target.value})} required />
                </div>
                <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Summa ($)</label>
                    <input type="number" min="0" className="form-input" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: parseInt(e.target.value)})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Sana</label>
                    <input type="date" className="form-input" value={newExpense.date} onChange={e => setNewExpense({...newExpense, date: e.target.value})} required />
                  </div>
                </div>
                <button type="submit" className="btn w-full" style={{justifyContent: 'center'}}>
                  <Plus size={16} /> Qo'shish
                </button>
              </form>
            </div>

            <div className="card">
              <h2 className="card-title">Oxirgi Xarajatlar</h2>
              <div className="flex-col gap-3">
                {expenses.map(exp => (
                  <div key={exp._id} className="flex justify-between items-center" style={{ padding: '1rem', background: 'var(--bg-dark)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'white', marginBottom: '0.25rem' }}>{exp.description}</div>
                      <div className="text-muted" style={{ fontSize: '0.875rem' }}>{new Date(exp.date).toLocaleDateString('uz-UZ')}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span style={{ color: 'var(--danger)', fontWeight: 700 }}>-${exp.amount}</span>
                      <button className="btn btn-danger" onClick={() => handleDeleteExpense(exp._id)} style={{ padding: '0.4rem' }}><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
                {expenses.length === 0 && <div className="text-center text-muted" style={{padding: '1rem'}}>Hali xarajatlar yo'q</div>}
              </div>
            </div>
          </div>
        )}

        {/* MOLIYA VA MIJOZLAR */}
        {activeTab === 'finance' && (
          <div className="card fade-in-up">
            <div className="flex justify-between items-center mb-4">
              <h2 className="card-title" style={{ margin: 0 }}>Moliya va Mijozlar Bazasi</h2>
              <button className="btn btn-success" onClick={exportToExcel} style={{ background: '#10b981', color: 'white', borderColor: '#10b981' }}>
                <Download size={18} /> Excel ga Yuklash
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', color: 'white' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '1rem 0' }}>Mijoz</th>
                    <th>To'y sanasi</th>
                    <th>Telefon & Aloqa</th>
                    <th>Umumiy Narx</th>
                    <th>Avans</th>
                    <th>Qarz</th>
                    <th>Harakat</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map(event => (
                    <tr key={event._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '1rem 0', fontWeight: 600 }}>{event.clientName || event.title}</td>
                      <td>{new Date(event.date).toLocaleDateString('uz-UZ')}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span>{event.clientPhone || '-'}</span>
                          {event.clientPhone && (
                            <a href={`https://wa.me/${event.clientPhone.replace(/[^0-9]/g, '')}?text=Assalomu alaykum! TimProduction jamoasi to'yingizga tayyor. Shartlarni kelishib olsak degandik...`} target="_blank" rel="noreferrer" title="WhatsApp orqali yozish" style={{ color: '#25D366' }}>
                              <MessageCircle size={18} />
                            </a>
                          )}
                        </div>
                      </td>
                      <td style={{ color: 'var(--success)' }}>${event.budget}</td>
                      <td>${event.advancePayment}</td>
                      <td style={{ color: (event.budget - event.advancePayment > 0) ? 'var(--danger)' : 'var(--text-muted)' }}>
                        ${event.budget - event.advancePayment}
                      </td>
                      <td>
                        <button className="btn btn-outline" onClick={() => handleEditEvent(event)} style={{ padding: '0.4rem', border: 'none' }}><Edit size={16} /></button>
                      </td>
                    </tr>
                  ))}
                  {events.length === 0 && (
                    <tr><td colSpan="7" className="text-center text-muted" style={{ padding: '2rem' }}>Ma'lumot yo'q</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MONTAGE KANBAN */}
        {activeTab === 'kanban' && (
          <div className="kanban-board fade-in-up">
            {kanbanColumns.map(column => (
              <div key={column} className="kanban-column">
                <div className="kanban-column-title">
                  {column}
                  <span className="badge" style={{ background: 'rgba(255,255,255,0.1)' }}>
                    {events.filter(e => e.status === column).length}
                  </span>
                </div>
                {events.filter(e => e.status === column).map(event => (
                  <div key={event._id} className="kanban-card">
                    <div style={{ fontWeight: 600, color: 'white', marginBottom: '0.5rem' }}>{event.title}</div>
                    <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                      <CalendarIcon size={12} style={{ display: 'inline', marginRight: '4px' }} />
                      {new Date(event.date).toLocaleDateString('uz-UZ')}
                    </div>
                    {event.videoLink && (
                      <a href={event.videoLink} target="_blank" rel="noreferrer" className="text-primary" style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '0.5rem' }}>
                        <ExternalLink size={14} /> Videoni ko'rish
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* KALENDAR */}
        {activeTab === 'calendar' && (
          <div className="card fade-in-up" style={{ height: '700px', padding: '1rem', background: 'var(--bg-dark)' }}>
            <Calendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%', color: 'white' }}
              messages={{ next: "Keyingi", previous: "Oldingi", today: "Bugun", month: "Oy", week: "Hafta", day: "Kun", agenda: "Ro'yxat" }}
            />
          </div>
        )}

        {/* TO'YLAR VA QO'SHISH */}
        {activeTab === 'events' && (
          <div className="grid grid-cols-2 fade-in-up" style={{alignItems: 'start'}}>
            <div className="card">
              <h2 className="card-title"><CalendarIcon size={20} /> {editEventId ? "To'yni Tahrirlash" : "Yangi To'y Qo'shish"}</h2>
              <form onSubmit={handleAddEvent}>
                <div className="form-group">
                  <label className="form-label">Sarlavha (M-n: Alisher & Malika)</label>
                  <input type="text" className="form-input" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} required />
                </div>
                <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Mijoz Ismi</label>
                    <input type="text" className="form-input" value={newEvent.clientName} onChange={e => setNewEvent({...newEvent, clientName: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mijoz Telefoni</label>
                    <input type="text" className="form-input" value={newEvent.clientPhone} onChange={e => setNewEvent({...newEvent, clientPhone: e.target.value})} placeholder="+998901234567" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Sana va Vaqt</label>
                  <input type="datetime-local" className="form-input" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} required />
                </div>
                <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">To'yxona</label>
                    <input type="text" className="form-input" value={newEvent.venue} onChange={e => setNewEvent({...newEvent, venue: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Manzil (Shahar, Tuman)</label>
                    <input type="text" className="form-input" value={newEvent.location} onChange={e => setNewEvent({...newEvent, location: e.target.value})} required />
                  </div>
                </div>
                <div className="grid grid-cols-3" style={{ gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Kamera soni</label>
                    <input type="number" min="1" className="form-input" value={newEvent.cameraCount} onChange={e => setNewEvent({...newEvent, cameraCount: parseInt(e.target.value)})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Umumiy Narx ($)</label>
                    <input type="number" min="0" className="form-input" value={newEvent.budget} onChange={e => setNewEvent({...newEvent, budget: parseInt(e.target.value)})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Olingan Avans ($)</label>
                    <input type="number" min="0" className="form-input" value={newEvent.advancePayment} onChange={e => setNewEvent({...newEvent, advancePayment: parseInt(e.target.value)})} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Qo'shimcha izoh (Kommentariy)</label>
                  <input type="text" className="form-input" value={newEvent.comment} onChange={e => setNewEvent({...newEvent, comment: e.target.value})} placeholder="M-n: 4K Syomka, Dron kerak..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Holat (Status)</label>
                  <select className="form-input" value={newEvent.status} onChange={e => setNewEvent({...newEvent, status: e.target.value})}>
                    <option value="Kutilmoqda">Kutilmoqda</option>
                    <option value="Syomka qilindi">Syomka qilindi</option>
                    <option value="Montajda">Montajda</option>
                    <option value="Tayyor">Tayyor</option>
                    <option value="Topshirildi">Topshirildi</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Operatorlarni tanlash</label>
                  <select multiple className="form-select" style={{ height: '100px' }} value={newEvent.assignedOperators} onChange={handleOperatorSelect} required>
                    {operators.map(op => (
                      <option key={op._id} value={op._id}>{op.fullName}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="btn w-full" style={{justifyContent: 'center'}}>
                    {editEventId ? <><Save size={16} /> Saqlash</> : <><Plus size={16} /> To'yni Saqlash</>}
                  </button>
                  {editEventId && (
                    <button type="button" className="btn btn-danger" onClick={cancelEditEvent} style={{padding: '0.75rem'}}>
                      <X size={16} />
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="card">
              <h2 className="card-title">Bo'lajak To'ylar</h2>
              <div className="flex-col gap-4">
                {events.map(event => (
                  <div key={event._id} style={{ padding: '1rem', background: 'var(--bg-dark)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <div className="flex justify-between items-center mb-4">
                      <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'white' }}>{event.title}</h3>
                      <div className="flex gap-2">
                        <button className="btn btn-primary" onClick={() => handleShareTelegram(event)} style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem' }} title="Operatorga yuborish"><Send size={14} style={{marginRight: '4px'}} /> Yuborish</button>
                        <button className="btn btn-outline" onClick={() => handleEditEvent(event)} style={{ padding: '0.4rem', border: 'none', background: 'rgba(255,255,255,0.05)' }}><Edit size={16} /></button>
                        <button className="btn btn-danger" onClick={() => handleDeleteEvent(event._id)} style={{ padding: '0.4rem' }}><Trash2 size={16} /></button>
                      </div>
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Holat: <span className="badge">{event.status}</span></div>
                    {event.comment && <div className="text-muted" style={{ fontSize: '0.875rem' }}>💬 {event.comment}</div>}
                  </div>
                ))}
                {events.length === 0 && <div className="text-muted text-center" style={{padding: '2rem 0'}}>Hozircha to'ylar yo'q</div>}
              </div>
            </div>
          </div>
        )}

        {/* OPERATORLAR VA QO'SHISH */}
        {activeTab === 'operators' && (
          <div className="grid grid-cols-2 fade-in-up" style={{alignItems: 'start'}}>
            <div className="card">
              <h2 className="card-title"><Users size={20} /> {editOpId ? "Operatorni Tahrirlash" : "Yangi Operator Qo'shish"}</h2>
              <form onSubmit={handleAddOperator}>
                <div className="form-group">
                  <label className="form-label">To'liq ism</label>
                  <input type="text" className="form-input" value={newOp.fullName} onChange={e => setNewOp({...newOp, fullName: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Login</label>
                  <input type="text" className="form-input" value={newOp.username} onChange={e => setNewOp({...newOp, username: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Parol {editOpId && "(O'zgartirmasangiz bo'sh qoldiring)"}</label>
                  <input type="password" className="form-input" value={newOp.password} onChange={e => setNewOp({...newOp, password: e.target.value})} required={!editOpId} />
                </div>
                <div className="form-group">
                  <label className="form-label">Telegram Username (Misol: @operator1)</label>
                  <input type="text" className="form-input" value={newOp.telegramUsername} onChange={e => setNewOp({...newOp, telegramUsername: e.target.value})} placeholder="@username" />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="btn w-full" style={{justifyContent: 'center'}}>
                    {editOpId ? <><Save size={16} /> Saqlash</> : <><Plus size={16} /> Qo'shish</>}
                  </button>
                  {editOpId && (
                    <button type="button" className="btn btn-danger" onClick={cancelEditOperator} style={{padding: '0.75rem'}}>
                      <X size={16} />
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="card">
              <h2 className="card-title">Operatorlar Ro'yxati</h2>
              <div className="flex-col gap-3">
                {operators.map(op => (
                  <div key={op._id} className="flex justify-between items-center" style={{ padding: '1rem', background: 'var(--bg-dark)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'white', marginBottom: '0.25rem' }}>{op.fullName}</div>
                      <div className="text-muted" style={{ fontSize: '0.875rem' }}>@{op.username} {op.telegramUsername && `| Telegram: ${op.telegramUsername}`}</div>
                    </div>
                    <div className="flex gap-2">
                      <button className="btn btn-outline" onClick={() => handleEditOperator(op)} style={{ padding: '0.4rem', border: 'none', background: 'rgba(255,255,255,0.05)' }}><Edit size={16} /></button>
                      <button className="btn btn-danger" onClick={() => handleDeleteOperator(op._id)} style={{ padding: '0.4rem' }}><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default Dashboard;
