import React, { useEffect, useState } from 'react';
import {
    Row, Tabs,
    Col,
    Input,
    Table,
    Spin,
    message,
    Button,
    Modal,
    Tooltip,
    Upload,
    Form,
    DatePicker,
    Select,
    Layout,
    Menu,
    Dropdown,
    Avatar, Popconfirm,
    Card
} from 'antd';
import { UploadOutlined, SettingOutlined, UserOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import apiConfig from '../../apiConfig.json';
import ViewerPDF from './ViewerPDF';
import { Link, useHistory } from "react-router-dom";
import style from "./Admin.module.css";

const { Search } = Input;
const { Header, Content } = Layout;

const EditableRow = ({ index, ...props }) => {
    const [form] = Form.useForm();
    return (
        <Form form={form} component={false}>
            <tr {...props} />
        </Form>
    );
};

const EditableCell = ({
    editing,
    dataIndex,
    title,
    inputType,
    record,
    index,
    children,
    ...restProps
}) => {
    return (
        <td {...restProps}>
            {editing ? (
                <Form.Item
                    name={dataIndex} // Quan trọng! Phải có name để lấy dữ liệu
                    style={{ margin: 0 }}
                    rules={[{ required: true, message: `Vui lòng nhập ${title}` }]}
                >
                    <Input defaultValue={record[dataIndex]} />
                </Form.Item>
            ) : (
                children
            )}
        </td>
    );
};

const Admin_SP_Ikea = () => {
    const [allData, setAllData] = useState([]); // tất cả phiên bản của các sản phẩm
    const [data, setData] = useState([]);         // phiên bản mới nhất của mỗi sản phẩm
    const [allProcessNames, setAllProcessNames] = useState([]);
    const [allProcessNames_, setAllProcessNames_] = useState([]);
    const [loading, setLoading] = useState(false);

    const [modalVisible, setModalVisible] = useState(false);
    const [modalData, setModalData] = useState([]); // dữ liệu các version của sản phẩm được chọn (mỗi phiên bản duy nhất)
    const [modalVersionVisible, setModalVersionVisible] = useState(false);
    const [modalVersionData, setModalVersionData] = useState([]);

    const [modalTitle, setModalTitle] = useState(''); // tên sản phẩm được chọn
    const [modalTaiLieuTitle, setModalTaiLieuTitle] = useState('');

    const [modalTitleId, setModalTitleId] = useState(''); // id sản phẩm được chọn
    const [bPN, setBPN] = useState('');

    const [form] = Form.useForm();
    const [processForm] = Form.useForm();

    const [formEdit] = Form.useForm();
    const [editingKey, setEditingKey] = useState("");

    const [addProcessModalVisible, setAddProcessModalVisible] = useState(false);
    const [addVersionModalVisible, setAddVersionModalVisible] = useState(false);
    const [file, setFile] = useState(null);
    const [pdfVisible, setPdfVisible] = useState(false);
    const [pdfUrl, setPdfUrl] = useState('');
    const [selectedProcess, setSelectedProcess] = useState(null);
    const [selectedProcess_, setSelectedProcess_] = useState(null);
    // Modal nhận xét khi xem tài liệu
    const [isCommentModalVisible, setIsCommentModalVisible] = useState(false);
    const [currentRecord, setCurrentRecord] = useState(null);
    const [comment, setComment] = useState('');

    // Modal trạng thái người dùng của 1 version
    const [statusModalVisible, setStatusModalVisible] = useState(false);
    const [statusData, setStatusData] = useState([]);

    const [messageApi, contextHolder] = message.useMessage();
    const currentRole = localStorage.getItem('role');
    const isEditing = (record) => record.SanPhamId === editingKey;
    const role = localStorage.getItem("role");
    const edit = (record) => {
        formEdit.setFieldsValue({ ...record });
        setEditingKey(record.SanPhamId);
    };

    const cancel = () => {
        setEditingKey("");
    };

    const save = async (key) => {
        try {
            const row = await formEdit.validateFields();
            const updatedData = { ...row, SanPhamId: key };
            console.log(updatedData)
            const response = await axios.put(`${apiConfig.API_BASE_URL}/B8/capnhatsanpham`, updatedData);
            if (response.status === 200) {
                setData((prevData) =>
                    prevData.map((item) =>
                        item.SanPhamId === key ? { ...item, ...updatedData } : item
                    )
                );
            }
            setEditingKey("");
        } catch (errInfo) {
            console.log("Lỗi khi lưu:", errInfo);
        }
    };
    // Hàm xử lý khi người dùng xác nhận nhận xét
    const handleConfirmComment = async () => {
        try {
            const userId = localStorage.getItem('userId');
            await axios.post(`${apiConfig.API_BASE_URL}/B8/markAsViewed`, {
                NguoiDungId: parseInt(userId),
                TaiLieuId: currentRecord.VersionId,
                NhanXet: comment
            });
            messageApi.open({ type: 'success', content: `Đã đánh dấu tài liệu là đã xem và ghi nhận nhận xét!` });
        } catch (error) {
            message.error("Có lỗi xảy ra khi đánh dấu đã xem: " + error.message);
            messageApi.open({ type: 'error', content: "Có lỗi xảy ra khi đánh dấu đã xem" });
        } finally {
            setIsCommentModalVisible(false);
            setComment('');
        }
    };

    const handleOpenCommentModal = () => {
        setIsCommentModalVisible(true);
    };

    // Xử lý khi chọn file
    const handleFileChange = (info) => {
        if (info.fileList && info.fileList.length > 0) {
            setFile(info.fileList[0].originFileObj);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${apiConfig.API_BASE_URL}/B8/sanphamall`);
            const list = res.data.filter(item => item.KhachHang === "IKEA");
            setAllData(list);
            setData(getLatestVersions(list));
            console.log(getLatestVersions(list))
            const names = Array.from(
                new Set(list.map((item) => item.BoPhanBanHanh).filter(Boolean))
            );
            setAllProcessNames(names);
        } catch (error) {
            messageApi.open({
                type: 'error',
                content: `Lỗi lấy dữ liệu`,
            });
        } finally {
            setLoading(false);
        }
    };

    // Khi người dùng click vào 1 hàng, mở PDF ngay lập tức
    const handleViewPdf = async (record) => {
        setModalVisible(false);
        setModalVersionVisible(false);
        setCurrentRecord(record);
        if (record.PhienBan === null) {
            messageApi.open({
                type: 'error',
                content: `Phiên bản không tồn tại!`,
            });
        }
        else {
            try {
                const url = `${apiConfig.API_BASE_URL}/B8/viewTLPDF?TaiLieuId=${record.TaiLieuId}`;
                setPdfUrl(url);
                setPdfVisible(true);
            } catch (error) {
                messageApi.open({
                    type: 'error',
                    content: `Lỗi xem PDF: ${error.message}`,
                });
            }
        }
    };

    const handleAddProcess = async () => {
        try {
            const values = await processForm.validateFields();
            const requestData = {
                KhachHang: values.KhachHang,
                DongHang: values.DongHang,
                MaCC: values.MaCC,
                TheLoai: values.TheLoai,
                TenSanPham: values.TenSanPham,
                BoPhanIds: values.BoPhanIds // Dữ liệu mảng
            };

            // Gọi API với JSON
            await axios.post(`${apiConfig.API_BASE_URL}/B8/themsanpham`, requestData, {
                headers: { 'Content-Type': 'application/json' }
            });

            messageApi.open({ type: 'success', content: `Thêm sản phẩm thành công!` });
            setAddProcessModalVisible(false);
            processForm.resetFields();
            await fetchData();
        } catch (error) {
            messageApi.open({
                type: 'error',
                content: `Lỗi thêm sản phẩm`,
            });
        }
    };
    const handleSendMail = async (record) => {
        try {
            const response = await axios.post(`${apiConfig.API_BASE_URL}/B8/guimailtailieu`, {
                TaiLieuId: record.TaiLieuId,
                BoPhan: record.BoPhan,  // Chỉ gửi cho bộ phận này
                CurrentUrl: window.location.href
            });
            messageApi.open({
                type: 'success',
                content: 'Gửi mail thành công'
            })
            // Cập nhật trạng thái ngay trong state
            setStatusData((prevData) =>
                prevData.map((item) =>
                    item.VersionId === record.VersionId && item.BoPhan === record.BoPhan
                        ? { ...item, BoPhanGui: item.BoPhanGui ? `${item.BoPhanGui},${record.BoPhan}` : record.BoPhan }
                        : item
                )
            );
        } catch (error) {
            console.log("Lỗi khi gửi mail: " + (error.response?.data || error.message));
        }
    };

    const handleAddVersion = async () => {
        try {
            setLoading(true);
            const values = await form.validateFields();
            if (!file) {
                messageApi.open({ type: 'error', content: `Vui lòng tải lên file PDF!` });
                return;
            }
            const formData = new FormData();
            formData.append('SanPhamId', modalTitleId);
            formData.append('TenTaiLieu', values.TenTaiLieu);
            formData.append('BoPhanBanHanh', values.BoPhanBanHanh);
            formData.append('MaSanPham', "NULL");
            formData.append('MuaSanPham', "NULL");
            if (!values.PhienBan || values.PhienBan.trim() === "") {
                formData.append('PhienBan', 0); // Hoặc có thể không thêm vào nếu API hỗ trợ
            } else {
                formData.append('PhienBan', values.PhienBan);
            }
            formData.append('NgayHieuLuc', values.NgayHieuLuc.format('YYYY-MM-DD'));
            formData.append('File', file);
            formData.append('CurrentUrl', window.location.href);
            formData.append('BoPhanIds', bPN);
            if (!values.NoiDungChinhSua || values.NoiDungChinhSua.trim() === "") {
                formData.append('NoiDungChinhSua', "NULL"); // Hoặc có thể không thêm vào nếu API hỗ trợ
            } else {
                formData.append('NoiDungChinhSua', values.NoiDungChinhSua);
            }
            // Log tất cả dữ liệu trong FormData
            console.log("📌 Dữ liệu FormData:");
            for (let pair of formData.entries()) {
                console.log(`${pair[0]}: ${pair[1]}`);
            }
            await axios.post(`${apiConfig.API_BASE_URL}/B8/themtailieusanpham`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            messageApi.open({ type: 'success', content: `Thêm phiên bản thành công!` });
            await fetchData();
            setAddVersionModalVisible(false);
            form.resetFields();
            setFile(null);
        } catch (error) {
            messageApi.open({
                type: 'error',
                content: `Phiên bản không tồn tại! ${error.message}`,
            });
            console.log("Lỗi chi tiết:", error.response?.data || error.message);
        }
        finally {
            setLoading(false);
        }
    };

    const handleDeleteVersion = async (TaiLieuId) => {
        try {
            setLoading(true);
            await axios.post(`${apiConfig.API_BASE_URL}/B8/xoatailieu`, {
                TaiLieuId
            });
            messageApi.open({ type: 'success', content: "Xóa phiên bản thành công!" });
            setModalData(prevData => {
                if (!prevData) return null; // Tránh lỗi nếu prevData là null hoặc undefined

                return {
                    ...prevData,
                    subItems: prevData.subItems?.filter(sub => sub.TaiLieuId !== TaiLieuId) || [],
                };
            });
            setModalVersionData(prevVersions =>
                prevVersions.filter(version => version.TaiLieuId !== TaiLieuId)
            );
            await fetchData();

        } catch (error) {
            messageApi.open({
                type: 'error',
                content: `Lỗi: ${error.message}`,
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteQuyTrinh = async (SanPhamId) => {
        try {

            setLoading(true);
            await axios.post(`${apiConfig.API_BASE_URL}/B8/xoasanpham`, {
                SanPhamId
            });
            messageApi.open({ type: 'success', content: "Xóa sản phẩm thành công!" });
            await fetchData(); // Cập nhật danh sách sau khi xóa

        } catch (error) {
            messageApi.open({
                type: 'error',
                content: `Lỗi: ${error.message}`,
            });
        } finally {
            setLoading(false);
        }
    };


    const optionsSelect = Array.from(
        new Set(data.map((item) => item.TenSanPham).filter(Boolean))
    ).map((uniqueName) => ({
        label: uniqueName,
        value: uniqueName,
    }));

    const createFilters = (key) => {
        const uniqueValues = [...new Set(data.map((item) => item[key]))];
        return uniqueValues.map((value) => ({
            text: value,
            value,
        }));
    };

    const uniqueBoPhan = [...new Set(allData
        .map(item => item.BoPhan)
        .filter(bp => bp))] // Loại bỏ giá trị NULL hoặc rỗng

    const boPhanOptions = uniqueBoPhan.map(bp => ({
        value: bp,
        label: bp
    }));
    const khachHangOptions = [
        { value: "IKEA", label: "IKEA" }
    ];
    const dongHangOptions = [
        { value: "HFB4", label: "HFB4" },
        { value: "HFB6", label: "HFB6" },
        { value: "HFB9", label: "HFB9" },
        { value: "HFB11", label: "HFB11" },
        { value: "HFB12", label: "HFB12" },
        { value: "HFB15", label: "HFB15" },
        { value: "HFB17", label: "HFB17" },
        { value: "HFB18", label: "HFB18" }
    ];

    const LPTFilters = createFilters('BoPhanBanHanh');
    const LPTFilters_TenSanPham = createFilters('TenSanPham');
    const CCCodeFilters = createFilters('MaCC')
    const groupedData = Object.values(
        data.reduce((acc, item) => {
            const key = `${item.MaCC}-${item.TenSanPham}`;

            if (!acc[key]) {
                acc[key] = {
                    ...item,
                    key,  // Thêm key để React không bị lỗi render
                    subItems: [],
                    subItems_: [],
                };
            }

            if (item.CCCode === null && item.ItemCode === null) {
                acc[key].subItems.push({
                    ...item,
                    key: `${item.TaiLieuId}-${item.PhienBan}`
                });
            }
            return acc;
        }, {})
    );
    console.log(groupedData)

    const columns = [
        {
            title: "Khách hàng",
            dataIndex: "KhachHang",
            key: "KhachHang",
            editable: true,
        },
        {
            title: "Dòng hàng",
            dataIndex: "DongHang",
            key: "DongHang",
            editable: true,
        },
        {
            title: "Thể loại",
            dataIndex: "TheLoai",
            key: "TheLoai",
            editable: true,
        },
        {
            title: "Item Number",
            dataIndex: "MaCC",
            key: "MaCC",
            align: "center",
            editable: true,
            filters: CCCodeFilters,
            filterSearch: true,
            onFilter: (value, record) => record.MaCC.includes(value),
        },
        {
            title: "Tên sản phẩm",
            dataIndex: "TenSanPham",
            key: "TenSanPham",
            editable: true,
            // width: "20%",
            filters: LPTFilters_TenSanPham,
            filterSearch: true,
            onFilter: (value, record) => record.TenSanPham.includes(value),
            render: (text) =>
                text && text.length > 5 ? (
                    <Tooltip title={text}>
                        <span>{text.slice(0, 50)}...</span>
                    </Tooltip>
                ) : (
                    text
                ),
        },
        {
            title: 'Ngày cập nhật',
            dataIndex: 'NgayTao',
            key: 'NgayTao',
            align: "center",
            render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '',
        },
        {
            title: 'Chi Tiết',
            key: 'insert',
            align: "center",
            render: (text, record) => (
                <Button
                    type="primary"
                    onClick={(e) => { e.stopPropagation(); setBPN(record.BoPhanGui); setModalTitleId(record.SanPhamId); setAddVersionModalVisible(true) }}
                >
                    Thêm tài liệu
                </Button>
            ),
        },
        ...(role === "admin"
            ? [
                {
                    title: "",
                    key: "delete",
                    align: "center",
                    render: (text, record) => (
                        <Popconfirm
                            title="Bạn có chắc chắn muốn xóa sản phẩm này?"
                            onConfirm={(e) => {
                                e.stopPropagation();
                                handleDeleteQuyTrinh(record.SanPhamId);
                            }}
                            onCancel={(e) => e.stopPropagation()}
                            okText="Xóa"
                            cancelText="Hủy"
                        >
                            <Button type="primary" danger onClick={(e) => e.stopPropagation()}>
                                Xóa
                            </Button>
                        </Popconfirm>
                    ),
                },
                {
                    title: "",
                    key: "edit",
                    align: "center",
                    render: (_, record) => {
                        const editable = isEditing(record);
                        return editable ? (
                            <span>
                                <Button
                                    type="link"
                                    onClick={() => save(record.SanPhamId)}
                                    style={{ marginRight: 8 }}
                                >
                                    Lưu
                                </Button>
                                <Popconfirm title="Hủy chỉnh sửa?" onConfirm={cancel}>
                                    <Button type="link">Hủy</Button>
                                </Popconfirm>
                            </span>
                        ) : (
                            <Button
                                type="link"
                                disabled={editingKey !== ""}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    edit(record);
                                }}
                            >
                                Chỉnh sửa
                            </Button>
                        );
                    },
                },
            ]
            : []),
    ];

    const expandColumns = [
        {
            title: "Tên tài liệu",
            dataIndex: "TenTaiLieu",
            key: "TenTaiLieu",
            width: "25%",
            render: (text) =>
                text && text.length > 50 ? (
                    <Tooltip title={text}>
                        <span>{text.slice(0, 50)}...</span>
                    </Tooltip>
                ) : (
                    text
                ),
        },
        {
            title: "Bộ phận ban hành",
            dataIndex: "BoPhanBanHanh",
            key: "BoPhanBanHanh",
            align: "center",
        },
        {
            title: 'Phiên bản',
            dataIndex: 'FilePDF',
            key: 'FilePDF',
            align: "center",
            render: (text, record) => {
                if (record.PhienBan === null) {
                    return <span>Chưa có phiên bản</span>;
                }
                const downloadUrl = `${apiConfig.API_BASE_URL}/B8/downloadTLPDF?TaiLieuId=${record.TaiLieuId}`;
                return <a href={downloadUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>{record.PhienBan}</a>;
            },
        },
        {
            title: 'Ngày hiệu lực',
            dataIndex: 'NgayHieuLuc',
            key: 'NgayHieuLuc',
            align: "center",
            render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '',
        },
        {
            title: 'Comment',
            dataIndex: 'Comment',
            key: 'Comment',
            width: "20%",
            render: (text) =>
                text && text.length > 50 ? (
                    <Tooltip title={text}>
                        <span>{text.slice(0, 50)}...</span>
                    </Tooltip>
                ) : (
                    text
                ),
        },
        {
            title: 'Chi Tiết',
            key: 'action',
            align: "center",
            render: (text, record) => (
                <Button
                    type="primary"
                    onClick={(e) => { e.stopPropagation(); handleViewDetails(record.TenTaiLieu, record.TenSanPham, record.ItemCode) }}
                >
                    Xem tất cả
                </Button>
            ),
        },
        ...(role === "admin"
            ? [
                {
                    title: "",
                    key: "delete",
                    align: "center",
                    render: (text, record) => (
                        <Popconfirm
                            title="Bạn có chắc chắn muốn xóa tài liệu này?"
                            onConfirm={(e) => { e.stopPropagation(); handleDeleteVersion(record.TaiLieuId) }}
                            onCancel={(e) => e.stopPropagation()}
                            okText="Xóa"
                            cancelText="Hủy"
                        >
                            <Button type="primary" danger onClick={(e) => e.stopPropagation()}>
                                Xóa
                            </Button>
                        </Popconfirm>
                    ),
                },
            ]
            : []),
    ];
    const mergedColumns = columns.map((col) => {
        if (!col.editable) {
            return col;
        }
        return {
            ...col,
            onCell: (record) => ({
                record,
                inputType: "text",
                dataIndex: col.dataIndex,
                title: col.title,
                editing: isEditing(record),
            }),
        };
    });
    // Hàm lấy dữ liệu từ API khi component mount
    useEffect(() => {
        fetchData();
    }, []);

    // Hàm lọc để lấy phiên bản mới nhất cho mỗi QuyTrinh (theo SanPhamId)
    const getLatestVersions = (list) => {
        const grouped = {};
        list.forEach(item => {
            const key = `${item.MaCC}-${item.TenTaiLieu}-${item.ItemCode}`;
            const version = parseFloat(item.PhienBan); // Chuyển đổi thành số

            if (!grouped[key] || version > parseFloat(grouped[key].PhienBan)) {
                grouped[key] = item;
            }
        });
        // Sắp xếp theo thứ tự giảm dần của PhienBan
        return Object.values(grouped).sort((a, b) => new Date(b.NgayTao) - new Date(a.NgayTao))
    };


    const handleViewDetails = (TenTaiLieu, TenSanPham, ItemCode) => {
        // Lọc ra các dòng có cùng TenTaiLieu và TenSanPham
        const details = allData.filter(item =>
            item.TenTaiLieu === TenTaiLieu && item.TenSanPham === TenSanPham && item.ItemCode === ItemCode
        );
        // Nhóm dữ liệu theo TaiLieuId, mỗi TaiLieuId chỉ lấy dòng có phiên bản cao nhất
        const uniqueVersionsMap = new Map();
        details.forEach(item => {
            const existingItem = uniqueVersionsMap.get(item.TaiLieuId);
            if (!existingItem || parseFloat(item.PhienBan) > parseFloat(existingItem.PhienBan)) {
                uniqueVersionsMap.set(item.TaiLieuId, item);
            }
        });
        // Chuyển Map thành Array và sắp xếp theo PhienBan giảm dần
        const uniqueVersions = Array.from(uniqueVersionsMap.values())
            .sort((a, b) => parseFloat(b.PhienBan) - parseFloat(a.PhienBan));

        // Cập nhật modal
        setModalVersionData(uniqueVersions);
        setModalTaiLieuTitle(TenTaiLieu);
        // setModalTitleId(TenTaiLieu);
        setModalVersionVisible(true);
    };


    const handleSelectProcess = (value) => {
        setSelectedProcess(value);
        if (value) {
            const filteredData = getLatestVersions(
                allData.filter((item) => item.BoPhanBanHanh === value)
            );
            const names_ = Array.from(
                new Set(
                    allData
                        .filter(item => value.includes(item.BoPhanBanHanh)) // Chỉ lấy những item có BoPhanBanHanh thuộc names
                        .map(item => item.TenSanPham) // Lấy TenSanPham
                        .filter(Boolean) // Loại bỏ giá trị null hoặc undefined
                )
            );
            setAllProcessNames_(names_);
            setData(filteredData);
        }
        else {
            const allNames = Array.from(
                new Set(allData.map(item => item.TenSanPham).filter(Boolean))
            );

            setAllProcessNames_(allNames);
            setData(getLatestVersions(allData))
        }
    };

    const handleSelectProcess_ = (value) => {
        setSelectedProcess_(value);
        if (value) {
            const filteredData = getLatestVersions(
                allData.filter((item) => item.TenSanPham === value)
            );
            setData(filteredData);
        } else {
            if (selectedProcess) {
                const filteredData = getLatestVersions(
                    allData.filter((item) => item.BoPhanBanHanh === selectedProcess)
                );
                setData(filteredData)
            }
            else
                setData(getLatestVersions(allData));
        }
    };

    // ----- Các cột cho Modal "Xem chi tiết" chỉ hiển thị thông tin Version -----
    const modalVersionColumns = [
        {
            title: 'Phiên bản',
            dataIndex: 'FilePDF',
            key: 'FilePDF',
            align: "center",
            render: (text, record) => {
                if (record.PhienBan === null) {
                    return <span>Chưa có phiên bản</span>;
                }
                const downloadUrl = `${apiConfig.API_BASE_URL}/B8/downloadTLPDF?TaiLieuId=${record.TaiLieuId}`;
                return <a href={downloadUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>{record.PhienBan}</a>;
            },
        },
        {
            title: 'Ngày hiệu lực',
            dataIndex: 'NgayHieuLuc',
            key: 'NgayHieuLuc',
            align: "center",
            render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '',
        },
        {
            title: 'Ngày cập nhật',
            dataIndex: 'NgayTao',
            key: 'NgayTao',
            align: "center",
            render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '',
        },
        {
            title: 'Comment',
            dataIndex: 'Comment',
            key: 'Comment',
            width: "20%",
            render: (text) =>
                text && text.length > 50 ? (
                    <Tooltip title={text}>
                        <span>{text.slice(0, 50)}...</span>
                    </Tooltip>
                ) : (
                    text
                ),
        },
        {
            title: 'Chi Tiết',
            key: 'action',
            align: "center",
            render: (text, record) => (
                <Button
                    type="primary"
                    onClick={(e) => { e.stopPropagation(); handleViewStatus(record); }}
                >
                    Xem tất cả
                </Button>
            ),
        },
        ...(role === "admin"
            ? [
                {
                    title: "",
                    key: "delete",
                    align: "center",
                    render: (text, record) => (
                        <Popconfirm
                            title="Bạn có chắc chắn muốn xóa tài liệu này?"
                            onConfirm={(e) => { e.stopPropagation(); handleDeleteVersion(record.TaiLieuId) }}
                            onCancel={(e) => e.stopPropagation()}
                            okText="Xóa"
                            cancelText="Hủy"
                        >
                            <Button type="primary" danger onClick={(e) => e.stopPropagation()}>
                                Xóa
                            </Button>
                        </Popconfirm>
                    ),
                },
            ]
            : []),
    ];

    // Hàm mở Modal trạng thái (danh sách người dùng cho version được chọn)
    const handleViewStatus = (record) => {
        // Kiểm tra nếu BoPhanGui bị null hoặc undefined thì gán mảng rỗng []
        const boPhanGuiArray = record.BoPhanGui ? record.BoPhanGui.split(',') : [];

        // Lọc dữ liệu dựa trên VersionId và BoPhan có trong BoPhanGui
        const usersData = allData.filter(item =>
            item.TaiLieuId === record.TaiLieuId &&
            // (boPhanGuiArray.length === 0 || boPhanGuiArray.includes(item.BoPhan)) && 
            !item.ChucVu.toLowerCase().includes("admin") // Loại bỏ admin
        );

        setStatusData(usersData);
        setStatusModalVisible(true);
    };
    const homNay = dayjs();

    // Lọc tài liệu mới (trong 30 ngày gần đây)
    const taiLieuMoi = allData.filter(record => {
        if (!record.NgayTao) return false;
        const ngayTao = dayjs(record.NgayTao);
        return homNay.diff(ngayTao, "day") < 30;
    });
    const uniqueQuyTrinh = new Set(taiLieuMoi.map(record => `${record.TenSanPham}_${record.TaiLieuId}`));
    const soQuyTrinhKhacNhau = uniqueQuyTrinh.size;

    return (
        <Layout className={style.admin}>
            <Content style={{ padding: 10, backgroundColor: '#162f48' }}>
                {contextHolder}
                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={8}>
                        <Card style={{ backgroundColor: '#001529', border: 'none' }}>
                            <Select
                                showSearch
                                size="large"
                                value={selectedProcess}
                                onChange={handleSelectProcess}
                                allowClear
                                placeholder="Chọn bộ phận"
                                style={{ width: '100%' }}
                                options={allProcessNames.map(name => ({ label: name, value: name }))}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Card style={{ backgroundColor: '#001529', border: 'none' }}>
                            <Select
                                showSearch
                                size="large"
                                value={selectedProcess_}
                                onChange={handleSelectProcess_}
                                allowClear
                                placeholder="Chọn sản phẩm"
                                style={{ width: '100%' }}
                                options={optionsSelect}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={4}>
                        <Card style={{ backgroundColor: '#001529', border: 'none' }}>
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                <Button type="primary" onClick={() => setAddProcessModalVisible(true)}>Thêm sản phẩm mới</Button>
                            </div>
                        </Card>
                    </Col>
                    {/* Bảng phiên bản mới nhất */}
                    <Col xs={24} sm={24}>

                        <Card style={{ backgroundColor: '#001529', border: 'none' }}>
                            {loading ? <Spin /> : (
                                <Spin spinning={false}>
                                    <Form form={formEdit} component={false}>
                                        <Table
                                            columns={mergedColumns}
                                            dataSource={groupedData}
                                            components={{
                                                body: { cell: EditableCell },
                                            }}
                                            onRow={(record) => ({
                                                onClick: (event) => {
                                                    if (editingKey === record.SanPhamId) {
                                                        // Nếu đang edit thì không làm gì cả
                                                        event.stopPropagation();
                                                        return;
                                                    }
                                                    setBPN(record.BoPhanGui);
                                                    setModalTitle(record.TenSanPham)
                                                    setModalData(record); // Lưu dữ liệu của dòng được click
                                                    setModalVisible(true); // Hiển thị modal
                                                },
                                            })}
                                        />
                                    </Form>
                                </Spin>
                            )}
                        </Card>


                    </Col>
                </Row>
                <Modal
                    title={`Chi tiết sản phẩm: ${modalTitle}`} // Sử dụng modalTitle
                    open={modalVisible}
                    onCancel={() => setModalVisible(false)}
                    footer={null}
                    className={style.modalVersions}
                    width="80%"
                    style={{ backgroundColor: '#001529' }}
                >
                    <Card style={{ backgroundColor: '#001529', border: 'none' }}>
                        <Table
                            className={style.tableVersions}
                            columns={expandColumns}
                            dataSource={modalData?.subItems || []} // Thay documentModalData thành modalData
                            pagination={false}
                            onRow={(record) => ({
                                onClick: () => { handleViewPdf(record) }
                            })}
                        />
                    </Card>
                </Modal>
                {/* --- Modal "Xem tất cả các phiên bản" --- */}
                <Modal
                    title={modalTaiLieuTitle}
                    open={modalVersionVisible}
                    onCancel={() => setModalVersionVisible(false)}
                    footer={[
                        <Button key="close" onClick={() => setModalVersionVisible(false)}>
                            Đóng
                        </Button>
                    ]}
                    className={style.modalVersions}
                    width="80%"
                    style={{ backgroundColor: '#001529' }}
                >
                    <Table
                        dataSource={modalVersionData}
                        columns={modalVersionColumns}
                        rowKey="VersionId"
                        pagination={false}
                        className={style.tableVersions}
                        scroll={{ y: 55 * 9 }}
                        onRow={(record) => ({
                            onClick: () => { handleViewPdf(record) }
                        })}
                    />
                </Modal>
                <Modal
                    title="Thêm tài liệu Mới"
                    open={addVersionModalVisible}
                    onCancel={() => setAddVersionModalVisible(false)}
                    className={style.modalVersions}
                    footer={[
                        <Button key="cancel" onClick={() => setAddVersionModalVisible(false)}>
                            Hủy
                        </Button>,
                        <Button key="submit" type="primary" onClick={handleAddVersion} loading={loading}>
                            Lưu
                        </Button>
                    ]}
                >
                    <Form form={form} layout="vertical" className={style.formAddVersion}
                    >
                        <Form.Item
                            label="Tên tài liệu"
                            name="TenTaiLieu"
                            rules={[{ required: true, message: 'Vui lòng nhập tên tài liệu!' }]}
                        >
                            <Input placeholder="Nhập tên tài liệu" />
                        </Form.Item>
                        {/* <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item
                                    label=" "
                                    name="MuaSanPham"
                                >
                                    <Input placeholder="Nhập mùa sản phẩm" hidden />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    label=" "
                                    name="MaSanPham"
                                // rules={[{ required: true, message: 'Vui lòng nhập Item Code!' }]}
                                >
                                    <Input placeholder="Do nothing" hidden />
                                </Form.Item>
                            </Col>
                        </Row> */}
                        <Form.Item
                            label="Phiên Bản"
                            name="PhienBan"
                        // rules={[{ required: true, message: 'Vui lòng nhập phiên bản!' }]}
                        >
                            <Input placeholder="Nhập số phiên bản" />
                        </Form.Item>
                        <Form.Item
                            label="Ngày hiệu lực"
                            name="NgayHieuLuc"
                            rules={[{ required: true, message: 'Vui lòng chọn Ngày hiệu lực!' }]}
                        >
                            <DatePicker format="YYYY-MM-DD" />
                        </Form.Item>
                        <Form.Item
                            label="Bộ phận ban hành"
                            name="BoPhanBanHanh"
                            rules={[{ required: true, message: 'Vui lòng chọn Bộ phận ban hành!' }]}
                        >
                            <Select
                                placeholder="Chọn bộ phận ban hành"
                                options={boPhanOptions} // Danh sách bộ phận lấy từ API
                            />
                        </Form.Item>
                        <Form.Item
                            label="Tải lên file PDF"
                            name="File"
                            rules={[{ required: true, message: 'Vui lòng tải lên file PDF!' }]}
                        >
                            <Upload
                                beforeUpload={() => false}
                                onChange={handleFileChange}
                                accept=".pdf"
                            >
                                <Button icon={<UploadOutlined />}>Chọn File</Button>
                            </Upload>
                        </Form.Item>
                        <Form.Item
                            label="Nội dung chỉnh sửa"
                            name="NoiDungChinhSua"
                        // rules={[{ required: true, message: 'Vui lòng nhập phiên bản!' }]}
                        >
                            <Input.TextArea
                                rows={4}
                                placeholder="Nhập nội dung chỉnh sửa"
                            />
                        </Form.Item>
                    </Form>
                </Modal>
                {/* --- Modal Nhập nhận xét --- */}
                <Modal
                    title="Nhập nhận xét"
                    open={isCommentModalVisible}
                    onOk={handleConfirmComment}
                    onCancel={() => setIsCommentModalVisible(false)}
                    okText="Xác nhận"
                    cancelText="Hủy"
                    className={style.modalComment}
                >
                    <p>Nhập nhận xét của bạn:</p>
                    <Input.TextArea
                        rows={4}
                        placeholder="Nhập nhận xét (nếu có)"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                    />
                </Modal>
                {/* --- Modal trạng thái người dùng của phiên bản --- */}
                <Modal
                    className={style.modalVersions}
                    title="Trạng thái người nhận"
                    open={statusModalVisible}
                    onCancel={() => setStatusModalVisible(false)}
                    width="80%"
                    footer={[
                        <Button key="close" onClick={() => setStatusModalVisible(false)}>
                            Đóng
                        </Button>
                    ]}
                >
                    <Table
                        dataSource={statusData}
                        className={style.tableVersions}
                        scroll={{ y: 55 * 9 }}
                        rowClassName={(record) => record.TrangThai === 'Chưa xem' ? style.notViewed : ''}
                        columns={[
                            {
                                title: 'Tên người dùng',
                                dataIndex: 'HoTen',
                                key: 'HoTen',
                            },
                            {
                                title: 'Bộ phận',
                                dataIndex: 'BoPhan', // Điều chỉnh key nếu tên field khác (vd: 'Chức vụ')
                                key: 'BoPhan',
                            },
                            {
                                title: 'Trạng thái',
                                dataIndex: 'TrangThai',
                                key: 'TrangThai',
                            },
                            {
                                title: 'Ngày xem',
                                dataIndex: 'NgayXem',
                                key: 'NgayXem',
                                render: (date) => date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : '',
                            },
                            {
                                title: 'Nhận xét',
                                dataIndex: 'NhanXet',
                                key: 'NhanXet',
                            },
                            {
                                title: 'Ghi chú',
                                key: 'GhiChu',
                                render: (_, record) => {
                                    // Kiểm tra BoPhanGui có null không
                                    const boPhanGuiArray = record.BoPhanGui ? record.BoPhanGui.split(',') : [];
                                    const isSent = boPhanGuiArray.includes(record.BoPhan);

                                    return isSent ? (
                                        'Được gửi mail'
                                    ) : (
                                        <Button
                                            type="link"
                                            onClick={() => handleSendMail(record)}
                                        >
                                            Gửi mail
                                        </Button>
                                    );
                                }
                            }
                        ]}
                        rowKey={(record, index) => `${record.VersionId}_${index}`}
                        pagination={false}
                    />
                </Modal>
                <Modal
                    title="Thêm sản phẩm Mới"
                    open={addProcessModalVisible}
                    onCancel={() => setAddProcessModalVisible(false)}
                    className={style.modalVersions}
                    footer={[
                        <Button key="cancel" onClick={() => setAddProcessModalVisible(false)}>
                            Hủy
                        </Button>,
                        <Button key="submit" type="primary" onClick={handleAddProcess}>
                            Lưu
                        </Button>
                    ]}
                >
                    <Form form={processForm} className={style.formAddVersion} layout="vertical">
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item
                                    label="Khách hàng"
                                    name="KhachHang"
                                    rules={[{ required: true, message: 'Vui lòng chọn khách hàng!' }]}
                                >
                                    <Select
                                        placeholder="Khách hàng"
                                        options={khachHangOptions}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    label="Dòng hàng"
                                    name="DongHang"
                                    rules={[{ required: true, message: 'Vui lòng chọn dòng hàng!' }]}
                                >
                                    <Select
                                        placeholder="Dòng hàng"
                                        options={dongHangOptions}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item
                                    label="Item Number"
                                    name="MaCC"
                                    rules={[{ required: true, message: 'Vui lòng nhập CC Code!' }]}
                                >
                                    <Input placeholder="Nhập Item Number" />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    label="Thể Loại"
                                    name="TheLoai"
                                // rules={[{ required: true, message: 'Vui lòng nhập Thể Loại!' }]}
                                >
                                    <Input placeholder="Nhập thể loại" />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Form.Item
                            label="Tên Sản Phẩm"
                            name="TenSanPham"
                            rules={[{ required: true, message: 'Vui lòng nhập Tên Sản Phẩm!' }]}
                        >
                            <Input placeholder="Nhập tên sản phẩm" />
                        </Form.Item>
                        <Form.Item
                            label="Bộ phận được phân phối"
                            name="BoPhanIds"
                            rules={[{ required: true, message: 'Vui lòng chọn bộ phận!' }]}
                        >
                            <Select
                                mode="multiple"
                                placeholder="Bộ phận được phân phối"
                                options={boPhanOptions} // Danh sách bộ phận lấy từ API
                            />
                        </Form.Item>
                    </Form>

                </Modal>
                {pdfVisible && (
                    <ViewerPDF
                        fileUrl={pdfUrl}
                        onClose={() => { setPdfVisible(false) }}
                        onComment={handleOpenCommentModal}
                    />
                )}
            </Content>
        </Layout>
    );
};

export default Admin_SP_Ikea;
