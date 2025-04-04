// ViewerPDF.js
import React from 'react';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import { Button, Space } from 'antd';

const ViewerPDF = ({ fileUrl, onClose, onComment, onSuaDoi, onGopY }) => {
    const defaultLayoutPluginInstance = defaultLayoutPlugin();
    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#fff', zIndex: 1000 }}>
            <div style={{ position: 'absolute', top: 4, right: 220, zIndex: 1100 }}>
                <Space>
                    <Button type="primary" onClick={onSuaDoi}>
                        Yêu cầu sửa đổi
                    </Button>
                    <Button type="primary" onClick={onGopY}>
                        Góp ý
                    </Button>
                    <Button onClick={onComment}>Comment</Button>
                    <Button onClick={onClose}>Đóng</Button>
                </Space>
            </div>
            <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.6.172/build/pdf.worker.min.js">
                <div style={{ height: '100%', overflow: 'auto' }}>
                    <Viewer fileUrl={fileUrl} plugins={[defaultLayoutPluginInstance]} />
                </div>
            </Worker>
        </div>
    );
};

export default ViewerPDF;
