import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
    Row,
    Col,
    Input,
    Table, Tabs,
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
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { saveAs } from "file-saver";
import ViewerPDF from './ViewerPDF';
import { renderAsync } from "docx-preview";
import { Link, useHistory } from "react-router-dom";
import style from "./Admin.module.css";
import ViewerWordOrPdf from './ViewerWordOrPdf';

const loadFile = async (url) => {
    const response = await fetch(url);
    return response.arrayBuffer();
};

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
                // rules={[{ required: true, message: `Vui lòng nhập ${title}` }]}
                >
                    <Input defaultValue={record[dataIndex]} />
                </Form.Item>
            ) : (
                children
            )}
        </td>
    );
};

const AppHeader = () => {
    const history = useHistory();
    const handleLogout = () => {
        // Xóa dữ liệu lưu trữ và chuyển hướng
        localStorage.removeItem('accessToken');
        localStorage.removeItem('role');
        localStorage.removeItem('HoTen');
        history.push('/B8'); // chuyển hướng về trang login
    };
    const menu = (
        <Menu>
            <Menu.Item key="account">
                <a href="/account">Tài khoản</a>
            </Menu.Item>
            <Menu.Item key="settings">
                <a href="/settings">Cài đặt</a>
            </Menu.Item>
            <Menu.Item key="logout" onClick={handleLogout}>
                Log Out
            </Menu.Item>
        </Menu>
    );

    return (
        <Header style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#fff',
            padding: '0 20px'
        }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>Quản lý tài liệu</div>
            <Dropdown overlay={menu} trigger={['click']}>
                <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <Avatar icon={<UserOutlined />} />
                    <span style={{ marginLeft: '8px' }}>{localStorage.getItem('HoTen')}</span>
                    {/* <SettingOutlined style={{ marginLeft: '8px' }} /> */}
                </div>
            </Dropdown>
        </Header>
    );
};
const Admin = () => {
    const [allData, setAllData] = useState([]); // tất cả phiên bản của các quy trình
    const [data, setData] = useState([]);         // phiên bản mới nhất của mỗi quy trình
    const [dataFeedback, setDataFeedback] = useState([]);
    const [dataFeedback_, setDataFeedback_] = useState([]);

    const [allProcessNames, setAllProcessNames] = useState([]);
    const [allProcessNames_, setAllProcessNames_] = useState([]);
    const [loading, setLoading] = useState(false);

    const [modalVisible, setModalVisible] = useState(false);
    const [prevModalVisible, setPrevModalVisible] = useState(false);
    const [modalData, setModalData] = useState([]);
    const [modalTitle, setModalTitle] = useState('');
    const [modalTitleId, setModalTitleId] = useState(''); // id quy trình được chọn

    const [modalFeedbackData, setModalFeedbackData] = useState([]);
    const [modalFeedbackTitle, setModalFeedbackTitle] = useState('');
    const [modalFeedbackVisible, setModalFeedbackVisible] = useState(false);
    const [modalFeedbackData_, setModalFeedbackData_] = useState([]);
    const [modalFeedbackTitle_, setModalFeedbackTitle_] = useState('');
    const [modalFeedbackVisible_, setModalFeedbackVisible_] = useState(false);


    const [form] = Form.useForm();
    const [processForm] = Form.useForm();
    const [formEdit] = Form.useForm();
    const [editingKey, setEditingKey] = useState("");
    const [formEdit_] = Form.useForm();
    const [editingKey_, setEditingKey_] = useState("");

    const [addProcessModalVisible, setAddProcessModalVisible] = useState(false);
    const [addVersionModalVisible, setAddVersionModalVisible] = useState(false);
    const [file, setFile] = useState(null);
    const [pdfVisible, setPdfVisible] = useState(false);
    const [pdfUrl, setPdfUrl] = useState('');

    const [wordUrl, setWordUrl] = useState(null);
    const [wordVisible, setWordVisible] = useState(false);

    const [selectedProcess, setSelectedProcess] = useState(null);
    const [selectedProcess_, setSelectedProcess_] = useState(null);
    const [selectedBoPhan, setSelectedBoPhan] = useState([]);

    // Modal nhận xét khi xem tài liệu
    const [isCommentModalVisible, setIsCommentModalVisible] = useState(false);
    const [currentRecord, setCurrentRecord] = useState(null);
    const [comment, setComment] = useState('');
    const [feedbackRecord, setFeedbackRecord] = useState(null);
    const [feedbackRecord_, setFeedbackRecord_] = useState(null);
    const [gopY, setGopY] = useState(false)
    // Modal trạng thái người dùng của 1 version
    const [statusModalVisible, setStatusModalVisible] = useState(false);
    const [statusData, setStatusData] = useState([]);

    const [messageApi, contextHolder] = message.useMessage();
    const role = localStorage.getItem('role');
    const [visible, setVisible] = useState(false);

    const [isModalSuaDoiOpen, setIsModalSuaDoiOpen] = useState(false);
    const [formSuaDoi] = Form.useForm();

    //xử lý cái sửa đổi hóp Ý
    const handleOpenSuaDoiModal = () => {
        formSuaDoi.resetFields();
        setIsModalSuaDoiOpen(true);
    };
    const handleGenerate = async (values) => {
        try {
            message.loading({ content: "Đang tạo file...", key: "docx" });
            console.log(feedbackRecord)
            const finalData = {
                ...values,
                NgayYKienBoPhanQuanLy: dayjs().format("DD/MM/YYYY"),
            };

            // Tải file template từ server (ví dụ: file vừa view trước đó)
            const fileResponse = await axios.get(`${apiConfig.API_BASE_URL}/B8/viewWord?id=${feedbackRecord.Id}`, {
                responseType: "blob"
            });

            const arrayBuffer = await fileResponse.data.arrayBuffer();
            const zip = new PizZip(arrayBuffer);

            const doc = new Docxtemplater(zip, {
                paragraphLoop: true,
                linebreaks: true,
            });

            doc.setData(finalData);
            doc.render();

            const output = doc.getZip().generate({ type: "blob" });
            saveAs(output, "output.docx");
            const fileName = `XacNhan_${feedbackRecord.MaSo}_${feedbackRecord.Id}.docx`;
            const formData = new FormData();
            formData.append("File", new File([output], fileName, {
                type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            }));
            formData.append("Id", feedbackRecord.Id);

            const response = await axios.post(`${apiConfig.API_BASE_URL}/B8/themquytrinhfeedbackconfirm`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.status === 200) {
                message.success({ content: "Xuất file DOCX và gửi phản hồi thành công!", key: "docx" });
            } else {
                message.error("Gửi phản hồi thất bại!");
            }

            messageApi.open({ type: 'success', content: `Xuất file DOCX thành công!` });
            setIsModalSuaDoiOpen(false);
        } catch (error) {
            console.error("Lỗi khi tạo file DOCX:", error);
            message.error("Có lỗi xảy ra, vui lòng thử lại!");
        }
    };

    const handleSaveFile = async () => {
        try {
            const Id = gopY ? feedbackRecord_.Id : feedbackRecord.Id;
            const fileResponse = await axios.get(
                `${apiConfig.API_BASE_URL}/B8/viewWordConfirm?id=${Id}`,
                { responseType: "blob" }
            );

            // Gợi ý: lấy tên file từ header nếu server có gửi
            const contentDisposition = fileResponse.headers['content-disposition'];
            let fileName = "Phieu-hoan-chinh.docx";
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="?(.+)"?/);
                if (match && match[1]) {
                    fileName = decodeURIComponent(match[1]);
                }
            }

            saveAs(fileResponse.data, fileName);
        } catch (error) {
            message.error("Lỗi khi tải file phản hồi!");
            console.error(error);
        }
    };
    //xử lý sử
    const isEditing = (record) => record.QuyTrinhId === editingKey;
    const isEditing_ = (record) => record.QuyTrinhVersionId === editingKey_;

    const edit = (record) => {
        formEdit.setFieldsValue({ ...record });
        setEditingKey(record.QuyTrinhId);
    };
    const containerRef = useRef(null);
    const cancel = () => {
        setEditingKey("");
    };

    const save = async (key) => {
        try {
            const row = await formEdit.validateFields();
            const updatedData = { ...row, Id: key };
            const response = await axios.put(`${apiConfig.API_BASE_URL}/B8/capnhatquytrinh`, updatedData);
            if (response.status === 200) {
                setData((prevData) =>
                    prevData.map((item) =>
                        item.QuyTrinhId === key ? { ...item, ...updatedData } : item
                    )
                );
            }
            setEditingKey("");
        } catch (errInfo) {
            console.log("Lỗi khi lưu:", errInfo);
        }
    };
    const edit_ = (record) => {
        formEdit_.setFieldsValue({ ...record });
        setEditingKey_(record.QuyTrinhVersionId);
    };

    const cancel_ = () => {
        setEditingKey_("");
    };

    const save_ = async (key) => {
        try {
            const row = await formEdit.validateFields();
            const updatedData = { ...row, Id: key };
            const response = await axios.put(`${apiConfig.API_BASE_URL}/B8/capnhatquytrinh`, updatedData);
            if (response.status === 200) {
                setData((prevData) =>
                    prevData.map((item) =>
                        item.QuyTrinhId === key ? { ...item, ...updatedData } : item
                    )
                );
            }
            setEditingKey_("");
        } catch (errInfo) {
            console.log("Lỗi khi lưu:", errInfo);
        }
    };
    // Hàm xử lý khi người dùng xác nhận nhận xét
    const handleConfirmComment = async () => {
        try {
            const userId = localStorage.getItem('userId');
            console.log(currentRecord.QuyTrinhVersionId)
            await axios.post(`${apiConfig.API_BASE_URL}/B8/markAsViewed`, {
                NguoiDungId: parseInt(userId),
                QuyTrinhVersionId: currentRecord.QuyTrinhVersionId,
                NhanXet: comment
            });
            messageApi.open({ type: 'success', content: `Đã đánh dấu tài liệu là đã xem và ghi nhận nhận xét!` });
        } catch (error) {
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
            const res = await axios.get(`${apiConfig.API_BASE_URL}/B8/quytrinhall`);
            const list = res.data;
            setAllData(list);
            setData(getLatestVersions(list));

            const names = Array.from(
                new Set(list.map((item) => item.BoPhanBanHanh).filter(Boolean))
            ).sort((a, b) => {
                const matchA = a.match(/^B(\d+)/);
                const matchB = b.match(/^B(\d+)/);

                if (matchA && matchB) {
                    return parseInt(matchA[1]) - parseInt(matchB[1]); // Sắp xếp số thứ tự B1 -> B9
                }

                if (matchA) return -1; // Các mục B1 - B9 đứng trước
                if (matchB) return 1;

                return 0; // Giữ nguyên vị trí nếu không phải B1 - B9
            });
            setAllProcessNames(names);
        } catch (error) {
            messageApi.open({
                type: 'error',
                content: `Lỗi lấy dữ liệu`,
            });
        } finally {
            setLoading(false);
            const allNames = Array.from(
                new Set(allData.map(item => item.TenQuyTrinh).filter(Boolean))
            );

            setAllProcessNames_(allNames);
        }
    };


    const fetchDataFeedback = async () => {
        try {
            const res = await axios.get(`${apiConfig.API_BASE_URL}/B8/quytrinhfeedback`);
            const list = res.data;

            // Lọc theo FilePath và FilePath_
            const withFilePath = list.filter(item => item.FilePath_ == null);
            const withoutFilePath_ = list.filter(item => item.FilePath == null);
            console.log(withoutFilePath_)
            setDataFeedback(withFilePath);
            setDataFeedback_(withoutFilePath_);
        } catch (error) {
            messageApi.open({
                type: 'error',
                content: `Lỗi lấy dữ liệu`,
            });
        }
    };


    // Khi người dùng click vào 1 hàng, mở PDF ngay lập tức
    const handleViewPdf = async (record) => {
        setPrevModalVisible(modalVisible); // Lưu trạng thái trước khi đóng
        setModalVisible(false);
        setCurrentRecord(record);
        if (record.PhienBan === null) {
            messageApi.open({
                type: 'error',
                content: `Phiên bản không tồn tại!`,
            });
        }
        else {
            try {
                const url = `${apiConfig.API_BASE_URL}/B8/viewPDF?QuyTrinhVersionId=${record.QuyTrinhVersionId}`;
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

    const handleViewWord = async (record) => {
        setFeedbackRecord(record);
        if (!record?.Id) {
            messageApi.open({
                type: 'error',
                content: `Không có file Word để xem!`,
            });
            return;
        }
        setDataFeedback((prevData) =>
            prevData.map((item) =>
                item.Id === record.Id
                    ? {
                        ...item,
                        TrangThai: "Đã xem",
                    }
                    : item
            )
        );
        setModalFeedbackData((prevData) =>
            prevData.map((item) =>
                item.Id === record.Id
                    ? {
                        ...item,
                        TrangThai: "Đã xem",
                    }
                    : item
            )
        );
        try {
            const response = await axios.get(
                `${apiConfig.API_BASE_URL}/B8/viewWord?id=${record.Id}`,
                { responseType: "blob" }
            );

            if (response.status === 200) {
                setVisible(true);
                const arrayBuffer = await response.data.arrayBuffer();

                if (containerRef.current) {
                    containerRef.current.innerHTML = ""; // Clear cũ
                    await renderAsync(arrayBuffer, containerRef.current);
                    // Hiện modal sau khi render
                }
            } else {
                message.error("Không lấy được file Word!");
            }
        } catch (error) {
            message.error(`Lỗi xem file Word: ${error.message}`);
        }
    };
    const handleViewWord_ = async (record) => {
        setGopY(true)
        setFeedbackRecord_(record);
        if (!record?.Id) {
            messageApi.open({
                type: 'error',
                content: `Không có file Word để xem!`,
            });
            return;
        }
        setDataFeedback_((prevData) =>
            prevData.map((item) =>
                item.Id === record.Id
                    ? {
                        ...item,
                        TrangThai: "Đã xem",
                    }
                    : item
            )
        );
        setModalFeedbackData_((prevData) =>
            prevData.map((item) =>
                item.Id === record.Id
                    ? {
                        ...item,
                        TrangThai: "Đã xem",
                    }
                    : item
            )
        );
        try {
            const response = await axios.get(
                `${apiConfig.API_BASE_URL}/B8/viewWord?id=${record.Id}`,
                { responseType: "blob" }
            );

            if (response.status === 200) {
                setVisible(true);
                const arrayBuffer = await response.data.arrayBuffer();

                if (containerRef.current) {
                    containerRef.current.innerHTML = ""; // Clear cũ
                    await renderAsync(arrayBuffer, containerRef.current);
                    // Hiện modal sau khi render
                }
            } else {
                message.error("Không lấy được file Word!");
            }
        } catch (error) {
            message.error(`Lỗi xem file Word: ${error.message}`);
        }
    };

    const handleViewWord_confirm = async (record) => {
        setFeedbackRecord(record);
        if (!record?.Id) {
            messageApi.open({
                type: 'error',
                content: `Không có file Word để xem!`,
            });
            return;
        }

        try {
            const response = await axios.get(
                `${apiConfig.API_BASE_URL}/B8/viewWordConfirm?id=${record.Id}`,
                { responseType: "blob" }
            );

            if (response.status === 200) {
                setVisible(true);
                const arrayBuffer = await response.data.arrayBuffer();

                if (containerRef.current) {
                    containerRef.current.innerHTML = ""; // Clear cũ
                    await renderAsync(arrayBuffer, containerRef.current);
                    // Hiện modal sau khi render
                }
            } else {
                messageApi.open({
                    type: 'error',
                    content: `Chưa có ý kiến của bộ phân ban hành!`,
                });
            }
        } catch (error) {
            messageApi.open({
                type: 'warning',
                content: `Chưa có ý kiến của bộ phân ban hành!`,
            });
        }
    };
    // Xử lý submit form thêm quy trình mới
    const handleAddProcess = async () => {
        try {
            const values = await processForm.validateFields();
            // Gọi API thêm quy trình
            await axios.post(`${apiConfig.API_BASE_URL}/B8/themquytrinh`, values);
            messageApi.open({ type: 'success', content: `Thêm quy trình thành công!` });
            setAddProcessModalVisible(false);
            processForm.resetFields();
            await fetchData();
        } catch (error) {
            messageApi.open({
                type: 'error',
                content: `Lỗi thêm quy trình`,
            });
        }
    };
    const handleSendMail = async (record) => {
        try {
            const response = await axios.post(`${apiConfig.API_BASE_URL}/B8/guimailquytrinhversion`, {
                QuyTrinhVersionId: record.QuyTrinhVersionId,
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
                    item.QuyTrinhVersionId === record.QuyTrinhVersionId && item.BoPhan === record.BoPhan
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
            formData.append('QuyTrinhId', modalTitleId);
            formData.append('TenQuyTrinh', modalTitle);
            formData.append('PhienBan', values.PhienBan);
            formData.append('NgayHieuLuc', values.NgayHieuLuc.format('YYYY-MM-DD'));
            formData.append('File', file);
            if (!values.NoiDungChinhSua || values.NoiDungChinhSua.trim() === "") {
                formData.append('NoiDungChinhSua', "NULL"); // Hoặc có thể không thêm vào nếu API hỗ trợ
            } else {
                formData.append('NoiDungChinhSua', values.NoiDungChinhSua);
            }
            formData.append('CurrentUrl', window.location.href);
            values.BoPhanIds.forEach(id => formData.append('BoPhanIds', id));

            // Log tất cả dữ liệu trong FormData
            console.log("📌 Dữ liệu FormData:");
            for (let pair of formData.entries()) {
                console.log(`${pair[0]}: ${pair[1]}`);
            }
            await axios.post(`${apiConfig.API_BASE_URL}/B8/themquytrinhversion`, formData, {
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
    const handleDeleteVersion = async (QuyTrinhVersionId) => {
        try {
            setLoading(true);
            await axios.post(`${apiConfig.API_BASE_URL}/B8/xoaphienban`, {
                QuyTrinhVersionId
            });
            messageApi.open({ type: 'success', content: "Xóa phiên bản thành công!" });
            setModalData(prevVersions =>
                prevVersions.filter(version => version.QuyTrinhVersionId !== QuyTrinhVersionId)
            );
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

    const handleDeleteQuyTrinh = async (QuyTrinhId) => {
        try {
            setLoading(true);
            await axios.post(`${apiConfig.API_BASE_URL}/B8/xoaquytrinh`, {
                QuyTrinhId
            });
            messageApi.open({ type: 'success', content: "Xóa quy trình thành công!" });
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
        new Set(data.map((item) => item.TenQuyTrinh).filter(Boolean))
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
        .filter(bp => bp))]

    const boPhanOptions = uniqueBoPhan.map(bp => ({
        value: bp,
        label: bp
    }));

    const LPTFilters = createFilters('BoPhanBanHanh');
    const LPTFilters_TenQuyTrinh = createFilters('TenQuyTrinh');
    // Các cột cho bảng chính (phiên bản mới nhất của mỗi quy trình)
    const columns = [
        {
            title: 'Mã Quy Trình',
            dataIndex: 'MaSo',
            key: 'MaSo',
            editable: true,
        },
        {
            title: 'Tên Quy Trình',
            dataIndex: 'TenQuyTrinh',
            key: 'TenQuyTrinh',
            width: '25%',
            editable: true,
            filters: LPTFilters_TenQuyTrinh,
            filterSearch: true,
            onFilter: (value, record) => record.TenQuyTrinh.includes(value),
            render: (text) =>
                text && text.length > 100 ? (
                    <Tooltip title={text}>
                        <span>{text.slice(0, 100)}...</span>
                    </Tooltip>
                ) : (
                    text
                ),
        },
        {
            title: 'Bộ phận ban hành',
            dataIndex: 'BoPhanBanHanh',
            key: 'BoPhanBanHanh',
            width: '15%',
            align: "center",
            editable: true,
            filters: LPTFilters,
            filterSearch: true,
            onFilter: (value, record) => record.BoPhanBanHanh.includes(value),
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
                const downloadUrl = `${apiConfig.API_BASE_URL}/B8/downloadPDF?QuyTrinhVersionId=${record.QuyTrinhVersionId}`;
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
            render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '',
        },
        {
            title: 'Chi Tiết',
            key: 'action',
            align: "center",
            render: (text, record) => (
                <Button
                    type="primary"
                    onClick={(e) => { e.stopPropagation(); handleViewDetails(record.QuyTrinhId, record.TenQuyTrinh); }}
                >
                    Phiên bản
                </Button>
            ),
        },
        {
            title: 'Chi Tiết',
            key: 'action',
            align: "center",
            render: (text, record) => (
                <Button
                    type="primary"
                    onClick={(e) => { e.stopPropagation(); handleViewFeedbackDetails(record.QuyTrinhVersionId, record.TenQuyTrinh); }}
                >
                    Phản hồi
                </Button>
            ),
        },
        ...(role === "admin"
            ? [
                {
                    title: '',
                    key: 'delete',
                    align: "center",
                    render: (text, record) => (
                        <Popconfirm
                            title="Bạn có chắc chắn muốn xóa quy trình này?"
                            onConfirm={(e) => { e.stopPropagation(); handleDeleteQuyTrinh(record.QuyTrinhId) }}
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
                // {
                //     title: "",
                //     key: "edit",
                //     align: "center",
                //     render: (_, record) => {
                //         const editable = isEditing(record);
                //         return editable ? (
                //             <span>
                //                 <Button
                //                     type="link"
                //                     onClick={(e) => { e.stopPropagation() }}
                //                     style={{ marginRight: 8 }}
                //                 >
                //                     Lưu
                //                 </Button>
                //                 <Popconfirm title="Hủy chỉnh sửa?" onConfirm={(e) => { e.stopPropagation(); cancel() }} onCancel={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation() }}>
                //                     <Button type="link">Hủy</Button>
                //                 </Popconfirm>
                //             </span>
                //         ) : (
                //             <Button type="link" disabled={editingKey !== ""} onClick={(e) => { e.stopPropagation(); edit(record) }}>
                //                 Chỉnh sửa
                //             </Button>
                //         );
                //     },
                // },
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
        fetchDataFeedback();
    }, []);
    useEffect(() => {
        if (modalTitleId) {
            // Lọc dữ liệu từ allData theo modalTitleId
            const details = allData.filter(item => item.QuyTrinhId === modalTitleId);

            // Nhóm dữ liệu theo QuyTrinhVersionId (chỉ lấy dòng đầu tiên của mỗi phiên bản)
            const uniqueVersionsMap = new Map();
            details.forEach(item => {
                if (!uniqueVersionsMap.has(item.QuyTrinhVersionId)) {
                    uniqueVersionsMap.set(item.QuyTrinhVersionId, item);
                }
            });

            const uniqueVersions = Array.from(uniqueVersionsMap.values());
            // Sắp xếp theo phiên bản giảm dần
            uniqueVersions.sort((a, b) => b.PhienBan - a.PhienBan);

            setModalData(uniqueVersions);
        }
    }, [allData]);
    const getLatestVersions = (list) => {
        const grouped = {};

        list.forEach(item => {
            const key = item.QuyTrinhId;
            const version = parseFloat(item.PhienBan); // Chuyển đổi thành số

            if (!grouped[key] || version > parseFloat(grouped[key].PhienBan)) {
                grouped[key] = item;
            }
        });

        const departmentOrder = [
            "B1 (Phòng KH-KD)", "B2 (Phòng TC-LĐ)", "B3 (Phòng Vật tư)", "B4 (Phòng TC-KT)", "B5 (Phòng Chính trị)",
            "B6 (Phòng HC-HC)", "B7 (Phòng KT-CN)", "B8 (Phòng Kiểm nghiệm)", "B9 (Phòng Cơ điện)",
            "Ban CNTT", "Ban QLHT", "Ban NCPT"
        ];

        return Object.values(grouped).sort((a, b) => {
            // Sắp xếp theo BoPhanBanHanh trước
            const deptA = departmentOrder.indexOf(a.BoPhanBanHanh);
            const deptB = departmentOrder.indexOf(b.BoPhanBanHanh);
            if (deptA !== deptB) return deptA - deptB;

            // Regex để kiểm tra mã số
            const regex = /^([A-Z]+)\.(\d+)-(.+)$/;
            const matchA = a.MaSo ? a.MaSo.match(regex) : null;
            const matchB = b.MaSo ? b.MaSo.match(regex) : null;

            // Nếu một trong hai không hợp lệ, cho xuống dưới
            if (!matchA && !matchB) return 0; // Cả hai không hợp lệ, giữ nguyên thứ tự
            if (!matchA) return 1; // a không hợp lệ, xếp xuống dưới
            if (!matchB) return -1; // b không hợp lệ, xếp xuống trên

            // Lấy thông tin từ MaSo
            const [, typeA, numA] = matchA;
            const [, typeB, numB] = matchB;

            // Sắp xếp theo loại mã (QT trước HD)
            const typeComparison = typeB.localeCompare(typeA);
            if (typeComparison !== 0) return typeComparison;

            // Sắp xếp theo số thứ tự
            return parseInt(numA) - parseInt(numB);
        });
    };

    const handleViewDetails = (QuyTrinhId, TenQuyTrinh) => {
        // Lấy tất cả các dòng có cùng QuyTrinhId được chọn
        const details = allData.filter(item => item.QuyTrinhId === QuyTrinhId);

        // Nhóm dữ liệu theo QuyTrinhVersionId: mỗi QuyTrinhVersionId chỉ lấy dòng đầu tiên gặp được
        const uniqueVersionsMap = new Map();
        details.forEach(item => {
            if (!uniqueVersionsMap.has(item.QuyTrinhVersionId)) {
                uniqueVersionsMap.set(item.QuyTrinhVersionId, item);
            }
        });

        const uniqueVersions = Array.from(uniqueVersionsMap.values());
        // Sắp xếp theo phiên bản giảm dần (giả sử trường PhienBan là số)
        uniqueVersions.sort((a, b) => b.PhienBan - a.PhienBan);

        setModalData(uniqueVersions);
        setModalTitle(TenQuyTrinh);
        setModalTitleId(QuyTrinhId);
        setModalVisible(true);
    };

    const handleViewFeedbackDetails = (QuyTrinhVersionId, TenQuyTrinh) => {
        // Lấy tất cả các dòng có cùng QuyTrinhId được chọn
        const details = dataFeedback.filter(item => item.QuyTrinhVersionId === QuyTrinhVersionId);
        const details_ = dataFeedback_.filter(item => item.QuyTrinhVersionId === QuyTrinhVersionId);
        setModalFeedbackData(details);
        setModalFeedbackData_(details_);
        setModalFeedbackTitle(TenQuyTrinh);
        // setModalTitleId(QuyTrinhId);
        setModalFeedbackVisible(true);
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
                        .map(item => item.TenQuyTrinh) // Lấy TenQuyTrinh
                        .filter(Boolean) // Loại bỏ giá trị null hoặc undefined
                )
            );
            setAllProcessNames_(names_);
            setData(filteredData);
        }
        else {
            const allNames = Array.from(
                new Set(allData.map(item => item.TenQuyTrinh).filter(Boolean))
            );

            setAllProcessNames_(allNames);
            setData(getLatestVersions(allData))
        }
    };

    const handleSelectProcess_ = (value) => {
        setSelectedProcess_(value);
        if (value) {
            const filteredData = getLatestVersions(
                allData.filter((item) => item.TenQuyTrinh === value)
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
                const downloadUrl = `${apiConfig.API_BASE_URL}/B8/downloadPDF?QuyTrinhVersionId=${record.QuyTrinhVersionId}`;
                return <a href={downloadUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>{record.PhienBan}</a>;
            },
        },
        {
            title: 'Ngày hiệu lực',
            dataIndex: 'NgayHieuLuc',
            key: 'NgayHieuLuc',
            align: "center",
            editable: true,
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
            title: 'Chỉnh sửa',
            dataIndex: 'Comment',
            key: 'Comment',
            width: "30%",
            editable: true,
            render: (text) =>
                text && text.length > 100 ? (
                    <Tooltip title={text}>
                        <span>{text.slice(0, 100)}...</span>
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
                    Xem
                </Button>
            ),
        },
        {
            title: 'Chi Tiết',
            key: 'action',
            align: "center",
            render: (text, record) => (
                <Button
                    type="primary"
                    onClick={(e) => { e.stopPropagation(); handleViewFeedbackDetails(record.QuyTrinhVersionId, record.TenQuyTrinh); }}
                >
                    Phản hồi
                </Button>
            ),
        },
        ...(role === "admin"
            ? [
                {
                    title: '',
                    key: 'delete',
                    align: "center",
                    render: (text, record) => (
                        <Popconfirm
                            title="Bạn có chắc chắn muốn xóa phiên bản này?"
                            onConfirm={(e) => { e.stopPropagation(); handleDeleteVersion(record.QuyTrinhVersionId) }}
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
                        const editable = isEditing_(record);
                        return editable ? (
                            <span>
                                <Button
                                    type="link"
                                    onClick={(e) => { e.stopPropagation() }}
                                    style={{ marginRight: 8 }}
                                >
                                    Lưu
                                </Button>
                                <Popconfirm title="Hủy chỉnh sửa?" onConfirm={(e) => { e.stopPropagation(); cancel_() }} onCancel={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation() }}>
                                    <Button type="link">Hủy</Button>
                                </Popconfirm>
                            </span>
                        ) : (
                            <Button type="link" disabled={editingKey_ !== ""} onClick={(e) => { e.stopPropagation(); edit_(record) }}>
                                Chỉnh sửa
                            </Button>
                        );
                    },
                },
            ]
            : []),
    ];
    const mergedModalVersionColumns = modalVersionColumns.map((col) => {
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
                editing: isEditing_(record),
            }),
        };
    })

    const handleViewStatus = (record) => {
        // Kiểm tra nếu BoPhanGui bị null hoặc undefined thì gán mảng rỗng []
        const boPhanGuiArray = record.BoPhanGui ? record.BoPhanGui.split(',') : [];

        // Lọc dữ liệu dựa trên QuyTrinhVersionId và BoPhan có trong BoPhanGui
        const usersData = allData.filter(item =>
            item.QuyTrinhVersionId === record.QuyTrinhVersionId &&
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
    // const uniqueQuyTrinh = new Set(taiLieuMoi.map(record => `${record.TenQuyTrinh}_${record.QuyTrinhVersionId}`));
    // const soQuyTrinhKhacNhau = uniqueQuyTrinh.size;

    return (
        <Layout className={style.admin}>
            <Content style={{ padding: 10, backgroundColor: '#f5f5f5' }}>
                {contextHolder}
                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={8}>
                        <Card style={{ backgroundColor: '', border: 'none', boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)" }}>
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
                        <Card style={{ backgroundColor: '', border: 'none', boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)" }}>
                            <Select
                                showSearch
                                size="large"
                                value={selectedProcess_}
                                onChange={handleSelectProcess_}
                                allowClear
                                placeholder="Chọn tài liệu"
                                style={{ width: '100%' }}
                                options={optionsSelect}
                            />
                        </Card>
                    </Col>
                    {(role === "admin" || role === "admin_QuyTrinh") && (
                        <Col xs={24} sm={4}>
                            <Card style={{ backgroundColor: '', border: 'none', boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)" }}>
                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                    <Button type="primary" onClick={() => setAddProcessModalVisible(true)}>
                                        Thêm quy trình mới
                                    </Button>
                                </div>
                            </Card>
                        </Col>
                    )}

                    {/* Bảng phiên bản mới nhất */}
                    <Col xs={24} sm={24}>

                        <Card style={{ backgroundColor: '', border: 'none', boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)" }}>
                            {loading ? <Spin /> : (
                                <Form form={formEdit} component={false}>
                                    <Table
                                        dataSource={data}
                                        columns={mergedColumns}
                                        rowKey="QuyTrinhId"
                                        scroll={{ y: 55 * 9 }}
                                        components={{
                                            body: {
                                                row: EditableRow,
                                                cell: EditableCell,
                                            },
                                        }}
                                        onRow={(record) => ({
                                            onClick: (event) => {
                                                if (editingKey === record.QuyTrinhId) {
                                                    // Nếu đang edit thì không làm gì cả
                                                    event.stopPropagation();
                                                    return;
                                                }
                                                handleViewPdf(record);
                                            },
                                        })}
                                    />
                                </Form>
                            )}
                        </Card>

                    </Col>
                </Row>
                {/* --- Modal "Xem tất cả các phiên bản" --- */}
                <Modal
                    title={modalTitle}
                    open={modalVisible}
                    onCancel={() => setModalVisible(false)}
                    footer={[
                        (role === "admin" || role === "admin_QuyTrinh") && (
                            <Button key="add" type="primary" onClick={() => setAddVersionModalVisible(true)}>
                                Thêm phiên bản
                            </Button>
                        ),
                        <Button key="close" onClick={() => setModalVisible(false)}>
                            Đóng
                        </Button>
                    ]}
                    className={style.modalVersions}
                    width="90%"
                >
                    <Form form={formEdit_} component={false}>
                        <Table
                            dataSource={modalData}
                            columns={mergedModalVersionColumns}
                            rowKey="QuyTrinhVersionId"
                            pagination={false}
                            className={style.tableVersions}
                            scroll={{ y: 55 * 9 }}
                            components={{
                                body: {
                                    row: EditableRow,
                                    cell: EditableCell,
                                },
                            }}
                            onRow={(record) => ({
                                onClick: (event) => {
                                    if (editingKey_ === record.QuyTrinhVersionId) {
                                        // Nếu đang edit thì không làm gì cả
                                        event.stopPropagation();
                                        return;
                                    }
                                    handleViewPdf(record);
                                },
                            })}
                        />
                    </Form>
                    {/* --- Modal Thêm Version --- */}
                    <Modal
                        title="Thêm Version Mới"
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
                        <Form form={form} layout="vertical" className={style.formAddVersion}>
                            <Form.Item
                                label="Phiên Bản"
                                name="PhienBan"
                                rules={[{ required: true, message: 'Vui lòng nhập phiên bản!' }]}
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
                                label="Bộ phận được phân phối"
                                name="BoPhanIds"
                                rules={[{ required: true, message: 'Vui lòng chọn bộ phận!' }]}
                            >
                                <Select
                                    mode="multiple"
                                    placeholder="Bộ phận được phân phối"
                                    options={boPhanOptions}
                                    // value={selectedBoPhan}
                                    allowClear
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
                    <p>Chọn nhận xét của bạn:</p>
                    <Select
                        placeholder="Chọn nhận xét"
                        style={{ width: "100%" }}
                        value={comment}
                        onChange={(value) => setComment(value)}
                        options={[
                            { value: "Tiếp nhận", label: "Tiếp nhận" },
                            { value: "Đào tạo", label: "Đào tạo" },
                            { value: "Tuân thủ", label: "Tuân thủ" }
                        ]}
                    />
                </Modal>
                {/* --- Modal trạng thái người dùng của phiên bản --- */}
                <Modal
                    className={style.modalVersions}
                    title="Trạng thái người nhận"
                    open={statusModalVisible}
                    onCancel={() => setStatusModalVisible(false)}
                    width="90%"
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
                                title: 'Đồng ý',
                                dataIndex: 'NgayDongY',
                                key: 'NgayDongY',
                                align: "center",
                                render: (date) => date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : '',
                            },
                            {
                                title: 'Tuân thủ',
                                dataIndex: 'NgayTuanThu',
                                key: 'NgayTuanThu',
                                align: "center",
                                render: (date) => date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : '',
                            },
                            {
                                title: 'Đào tạo',
                                dataIndex: 'NgayDaoTao',
                                key: 'NgayDaoTao',
                                align: "center",
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
                        rowKey={(record, index) => `${record.QuyTrinhVersionId}_${index}`}
                        pagination={false}
                    />
                </Modal>
                <Modal
                    className={style.modalVersions}
                    title="Yêu cầu sửa đổi, góp ý"
                    open={modalFeedbackVisible}
                    onCancel={() => setModalFeedbackVisible(false)}
                    width="90%"
                    footer={[
                        <Button key="close" onClick={() => setModalFeedbackVisible(false)}>
                            Đóng
                        </Button>
                    ]}
                >
                    <Tabs defaultActiveKey="1" className={style.customTabs}>
                        <Tabs.TabPane
                            tab={`Yêu cầu sửa đổi`}
                            key="1"
                        >
                            <Table
                                dataSource={modalFeedbackData}
                                className={style.tableVersions}
                                scroll={{ y: 55 * 9 }}
                                rowClassName={(record) => record.TrangThai === 'Chưa xem' ? style.notViewed : ''}
                                onRow={(record) => ({
                                    onClick: (event) => {
                                        handleViewWord(record);
                                    },
                                })}
                                columns={[
                                    {
                                        title: 'Bộ phận',
                                        dataIndex: 'BoPhan', // Điều chỉnh key nếu tên field khác (vd: 'Chức vụ')
                                        key: 'BoPhan',
                                        align: 'center',
                                    },
                                    {
                                        title: 'Trạng thái',
                                        dataIndex: 'TrangThai',
                                        key: 'TrangThai',
                                        align: 'center',
                                    },
                                    {
                                        title: 'Ngày phản hồi',
                                        dataIndex: 'FilePath',
                                        key: 'NgayPhanHoi',
                                        align: 'center',
                                        render: (text) => {
                                            const match = text.match(/_(\d+)\.docx$/); // Tìm số timestamp
                                            if (match) {
                                                const timestamp = parseInt(match[1], 10);
                                                const date = new Date(timestamp);
                                                // Định dạng ngày theo múi giờ Việt Nam
                                                return date.toLocaleDateString('vi-VN', {
                                                    timeZone: 'Asia/Ho_Chi_Minh',
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: 'numeric',
                                                });
                                            }
                                            return 'Không xác định';
                                        }
                                    },
                                    {
                                        title: 'Ghi chú',
                                        key: 'GhiChu',
                                        align: 'center',
                                        render: (_, record) => {
                                            return (
                                                <Button
                                                    type="primary"
                                                    onClick={(e) => { e.stopPropagation(); handleViewWord_confirm(record) }}
                                                >
                                                    Phiếu xác nhận
                                                </Button>
                                            );
                                        }
                                    }
                                ]}
                                rowKey={(record, index) => `${record.Id}_${index}`}
                                pagination={false}
                            />
                        </Tabs.TabPane>
                        <Tabs.TabPane
                            tab={`Góp ý`}
                            key="2"
                        >
                            <Table
                                dataSource={modalFeedbackData_}
                                className={style.tableVersions}
                                scroll={{ y: 55 * 9 }}
                                rowClassName={(record) => record.TrangThai === 'Chưa xem' ? style.notViewed : ''}
                                onRow={(record) => ({
                                    onClick: (event) => {
                                        handleViewWord_(record);
                                    },
                                })}
                                columns={[
                                    {
                                        title: 'Bộ phận',
                                        dataIndex: 'BoPhan', // Điều chỉnh key nếu tên field khác (vd: 'Chức vụ')
                                        key: 'BoPhan',
                                        align: 'center',
                                    },
                                    {
                                        title: 'Trạng thái',
                                        dataIndex: 'TrangThai',
                                        key: 'TrangThai',
                                        align: 'center',
                                    },
                                    {
                                        title: 'Ngày phản hồi',
                                        dataIndex: 'FilePath_',
                                        key: 'NgayPhanHoi_',
                                        align: 'center',
                                        render: (text) => {
                                            const match = text.match(/_(\d+)\.docx$/); // Tìm số timestamp
                                            if (match) {
                                                const timestamp = parseInt(match[1], 10);
                                                const date = new Date(timestamp);
                                                // Định dạng ngày theo múi giờ Việt Nam
                                                return date.toLocaleDateString('vi-VN', {
                                                    timeZone: 'Asia/Ho_Chi_Minh',
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: 'numeric',
                                                });
                                            }
                                            return 'Không xác định';
                                        }
                                    },
                                    {
                                        title: 'Ghi chú',
                                        key: 'GhiChu',
                                        align: 'center',
                                        render: (_, record) => {
                                            return (
                                                <Button
                                                    type="primary"
                                                    onClick={(e) => { e.stopPropagation(); handleViewWord_confirm(record) }}
                                                >
                                                    Phiếu xác nhận
                                                </Button>
                                            );
                                        }
                                    }
                                ]}
                                rowKey={(record, index) => `${record.Id}_${index}`}
                                pagination={false}
                            />
                        </Tabs.TabPane>
                    </Tabs>
                </Modal>
                <Modal
                    title="Thêm Quy Trình Mới"
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
                        <Form.Item
                            label="Mã Quy Trình"
                            name="MaSo"
                            rules={[{ required: true, message: 'Vui lòng nhập Mã Số!' }]}
                        >
                            <Input placeholder="Nhập mã quy trình" />
                        </Form.Item>
                        <Form.Item
                            label="Tên Quy Trình"
                            name="TenQuyTrinh"
                            rules={[{ required: true, message: 'Vui lòng nhập Tên Quy Trình!' }]}
                        >
                            <Input placeholder="Nhập tên quy trình" />
                        </Form.Item>
                        <Form.Item
                            label="Bộ phận ban hành"
                            name="BoPhanBanHanh"
                            rules={[{ required: true, message: 'Vui lòng nhập Bộ phận ban hành!' }]}
                        >
                            <Select
                                placeholder="Chọn bộ phận ban hành"
                                options={boPhanOptions} // Danh sách bộ phận lấy từ API
                            />
                        </Form.Item>
                    </Form>
                </Modal>
                {pdfVisible && (
                    <ViewerPDF
                        fileUrl={pdfUrl}
                        onClose={() => {
                            setPdfVisible(false);
                            if (prevModalVisible) {
                                setModalVisible(true); // Mở lại modal nếu trước đó đang mở
                            }
                        }}
                        onComment={handleOpenCommentModal}
                    />
                )}
                <Modal
                    title="Phản hồi"
                    open={visible}
                    onCancel={() => { setVisible(false); setGopY(false) }}
                    footer={[
                        // <Button type="primary" danger onClick={handleSaveFile}>
                        //     Xóa
                        // </Button>,
                        <Button onClick={handleSaveFile}>
                            Xuất
                        </Button>,
                        (gopY === false) && (
                            <Button type="primary" onClick={handleOpenSuaDoiModal}>
                                Ý kiến của BPQLHT
                            </Button>
                        )
                    ]}
                    width={1000}
                >
                    <div
                        ref={containerRef}
                        style={{
                            border: "1px solid #ccc",
                            // maxHeight: "800px",
                            overflowY: "auto",
                            background: "#fff",
                        }}
                    />
                </Modal>
                <Modal
                    title="Nhập Dữ Liệu Tạo DOCX"
                    open={isModalSuaDoiOpen}
                    onCancel={() => setIsModalSuaDoiOpen(false)}
                    footer={null}
                    width={800}
                >
                    <Form form={formSuaDoi} layout="vertical" onFinish={handleGenerate}>

                        <Form.Item label="Ý kiến của Bộ phận Quản lý hệ thống" name="YKienBoPhanQuanLy">
                            <Input.TextArea />
                        </Form.Item>
                        <Form.Item label="Chữ ký (ghi rõ họ tên) của Bộ phận Quản lý hệ thống" name="ChuKyBoPhanQuanLy">
                            <Input />
                        </Form.Item>

                        <Form.Item>
                            <Button type="primary" htmlType="submit">
                                Tạo DOCX
                            </Button>
                        </Form.Item>
                    </Form>
                </Modal>
            </Content>
        </Layout>
    );
};

export default Admin;
