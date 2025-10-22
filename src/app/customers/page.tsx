"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Customer, Outlet } from "@prisma/client";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import CustomerModal from "@/components/modals/CustomerModal";
import DeleteConfirmModal from "@/components/modals/DeleteConfirmModal";

export default function CustomersPage() {
  const { data: session } = useSession();
  const [customers, setCustomers] = useState<
    (Customer & { outlet?: Outlet })[]
  >([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });
  const [search, setSearch] = useState("");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedCustomer, setSelectedCustomer] = useState<
    (Customer & { outlet?: Outlet }) | undefined
  >();

  // Delete modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(
    null
  );
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Toast notification
  const [toast, setToast] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const fetchCustomers = async (pageToFetch = 1) => {
    try {
      const response = await fetch(
        `/api/customers?search=${search}&page=${pageToFetch}&limit=${pagination.limit}`
      );
      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers || []);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
      showToast("error", "Gagal memuat data pelanggan");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOutlets = async () => {
    try {
      const response = await fetch("/api/outlets");
      if (response.ok) {
        const data = await response.json();
        setOutlets(data.outlets || []);
      }
    } catch (error) {
      console.error("Error fetching outlets:", error);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchCustomers(1);
    }, 300); // Debounce search

    fetchOutlets();
    return () => clearTimeout(handler);
  }, [search, pagination.limit]);

  const showToast = (type: "success" | "error" | "info", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  const handleCreateCustomer = () => {
    setModalMode("create");
    setSelectedCustomer(undefined);
    setIsModalOpen(true);
  };

  const handleEditCustomer = (customer: Customer & { outlet?: Outlet }) => {
    setModalMode("edit");
    setSelectedCustomer(customer);
    setIsModalOpen(true);
  };

  const handleDeleteCustomer = (customer: Customer) => {
    setCustomerToDelete(customer);
    setIsDeleteModalOpen(true);
  };

  const handleSaveCustomer = async (customerData: any) => {
    try {
      const url =
        modalMode === "create"
          ? "/api/customers"
          : `/api/customers/${selectedCustomer?.id}`;

      const method = modalMode === "create" ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(customerData),
      });

      if (response.ok) {
        await fetchCustomers();
        showToast(
          "success",
          modalMode === "create"
            ? "Customer berhasil ditambahkan"
            : "Customer berhasil diperbarui"
        );
      } else {
        const error = await response.json();
        showToast("error", error.error || "Terjadi kesalahan");
      }
    } catch (error) {
      console.error("Error saving customer:", error);
      showToast("error", "Terjadi kesalahan saat menyimpan");
    }
  };

  const confirmDeleteCustomer = async () => {
    if (!customerToDelete) return;

    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/customers/${customerToDelete.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchCustomers();
        showToast("success", "Customer berhasil dihapus");
        setIsDeleteModalOpen(false);
        setCustomerToDelete(null);
      } else {
        const error = await response.json();
        showToast("error", error.error || "Gagal menghapus customer");
      }
    } catch (error) {
      console.error("Error deleting customer:", error);
      showToast("error", "Terjadi kesalahan saat menghapus");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <AuthenticatedLayout>
      <div className="main-content">
        {/* Page Header */}
        <div className="page-header p-4 mb-4">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="h3 mb-1 text-dark fw-bold">
                <i className="fas fa-users text-primary me-2"></i>
                Kelola Pelanggan
              </h1>
              <p className="text-muted mb-0">
                Manajemen data pelanggan untuk kampanye WhatsApp blast
              </p>
            </div>
            <button
              className="btn btn-primary btn-lg"
              onClick={handleCreateCustomer}
            >
              <i className="fas fa-user-plus me-2"></i>
              Tambah Pelanggan
            </button>
          </div>
        </div>

        {/* Customers Table */}
        <div className="card">
          <div className="card-header bg-white border-bottom">
            <div className="row align-items-center">
              <div className="col-md-6">
                <h5 className="card-title mb-0 text-dark fw-bold">
                  <i className="fas fa-address-book text-primary me-2"></i>
                  Daftar Pelanggan
                </h5>
              </div>
              <div className="col-md-6">
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="fas fa-search text-primary"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Cari Nama Pelanggan atau No WhatsApp"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search && (
                    <button
                      className="btn btn-outline-secondary"
                      onClick={() => setSearch("")}
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="card-body p-0">
            {isLoading ? (
              <div className="text-center p-5">
                <div className="spinner-border text-primary mb-3" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="text-muted">Memuat data pelanggan...</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead>
                    <tr>
                      <th>
                        <i className="fas fa-user me-2 text-primary"></i>
                        Nama
                      </th>
                      <th>
                        <i className="fab fa-whatsapp me-2 text-success"></i>
                        WhatsApp
                      </th>
                      
                      {(session?.user?.role === "SUPERADMIN" ||
                        session?.user?.role === "ADMIN") && (
                        <th>
                          <i className="fas fa-store me-2 text-warning"></i>
                          Outlet
                        </th>
                      )}
                      <th>
                        <i className="fas fa-calendar me-2 text-secondary"></i>
                        Terdaftar
                      </th>
                      <th>
                        <i className="fas fa-cogs me-2 text-dark"></i>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-5">
                          <div className="text-muted">
                            <i className="fas fa-users fa-3x mb-3 opacity-50"></i>
                            <p className="mb-1">
                              {search
                                ? "Tidak ada pelanggan yang cocok"
                                : "Belum ada data pelanggan"}
                            </p>
                            <small>
                              {search
                                ? `dengan pencarian "${search}"`
                                : 'Klik tombol "Tambah Pelanggan" untuk memulai'}
                            </small>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      customers.map((customer: any) => (
                        <tr key={customer.id}>
                          <td>
                            <div className="d-flex align-items-center">
                              <div
                                className="avatar-circle me-3"
                                style={{
                                  width: "40px",
                                  height: "40px",
                                  background: "var(--bs-success)",
                                }}
                              >
                                <i className="fas fa-user text-white"></i>
                              </div>
                              <div>
                                <strong className="text-dark">
                                  {customer.nama}
                                </strong>
                              </div>
                            </div>
                          </td>
                          <td>
                            <a
                              href={`https://wa.me/${customer.noWa.replace(
                                /\D/g,
                                ""
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-success text-decoration-none"
                            >
                              <i className="fab fa-whatsapp me-1"></i>
                              {customer.noWa}
                            </a>
                          </td>
                          
                          {(session?.user?.role === "SUPERADMIN" ||
                            session?.user?.role === "ADMIN") && (
                            <td>
                              <span className="badge bg-info-subtle text-info px-1 py-2">
                                <i className="fas fa-store me-1"></i>
                                {customer.outlet?.namaOutlet}
                              </span>
                            </td>
                          )}
                          <td>
                            <small className="text-muted">
                              <i className="fas fa-calendar me-1"></i>
                              {new Date(customer.createdAt).toLocaleDateString(
                                "id-ID",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                }
                              )}
                            </small>
                          </td>
                          <td>
                            <div className="btn-group">
                              <button
                                className="btn btn-sm btn-outline-primary"
                                title="Edit Customer"
                                onClick={() => handleEditCustomer(customer)}
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              <a
                                href={`https://wa.me/${customer.noWa.replace(
                                  /\D/g,
                                  ""
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-sm btn-outline-success"
                                title="Send WhatsApp"
                              >
                                <i className="fab fa-whatsapp"></i>
                              </a>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                title="Delete Customer"
                                onClick={() => handleDeleteCustomer(customer)}
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
            {/* Pagination */}
            {!isLoading && pagination.total > 0 && (
              <div className="card-footer bg-white d-flex justify-content-between align-items-center">
                <div className="text-muted small">
                  Menampilkan <strong>{customers.length}</strong> dari{" "}
                  <strong>{pagination.total}</strong> pelanggan
                </div>
                <div className="btn-group">
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => fetchCustomers(pagination.page - 1)}
                    disabled={!pagination.hasPrev}
                  >
                    <i className="fas fa-chevron-left me-1"></i>
                    Sebelumnya
                  </button>
                  <button className="btn btn-outline-secondary btn-sm" disabled>
                    Halaman {pagination.page} dari {pagination.totalPages}
                  </button>
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => fetchCustomers(pagination.page + 1)}
                    disabled={!pagination.hasNext}
                  >
                    Berikutnya
                    <i className="fas fa-chevron-right ms-1"></i>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Toast Notifications */}
        {toast && (
          <div
            className="position-fixed top-0 end-0 p-3"
            style={{ zIndex: 1055 }}
          >
            <div
              className={`alert alert-${
                toast.type === "success"
                  ? "success"
                  : toast.type === "error"
                  ? "danger"
                  : "info"
              } alert-dismissible fade show`}
            >
              <i
                className={`fas ${
                  toast.type === "success"
                    ? "fa-check-circle"
                    : toast.type === "error"
                    ? "fa-exclamation-circle"
                    : "fa-info-circle"
                } me-2`}
              ></i>
              {toast.message}
              <button
                type="button"
                className="btn-close"
                onClick={() => setToast(null)}
              ></button>
            </div>
          </div>
        )}
      </div>

      {/* Customer Modal */}
      <CustomerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveCustomer}
        customer={selectedCustomer}
        outlets={outlets}
        mode={modalMode}
        user={session?.user}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setCustomerToDelete(null);
        }}
        onConfirm={confirmDeleteCustomer}
        title="Hapus Customer"
        message="Apakah Anda yakin ingin menghapus customer ini?"
        itemName={customerToDelete?.nama}
        loading={deleteLoading}
      />
    </AuthenticatedLayout>
  );
}
